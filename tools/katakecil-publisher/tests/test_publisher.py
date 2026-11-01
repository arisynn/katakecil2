import datetime as dt
import importlib.util
import io
import json
import os
from contextlib import redirect_stdout
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('kk', ROOT / 'kk.py')
kk = importlib.util.module_from_spec(spec)
if spec.loader and (ROOT / 'kk.py').exists():
    spec.loader.exec_module(kk)


def fixture(path, chapter_name='text/ch1.xhtml', extra=''):
    with zipfile.ZipFile(path, 'w') as z:
        z.writestr('mimetype', 'application/epub+zip')
        z.writestr('META-INF/container.xml', '<container><rootfiles><rootfile full-path="OPS/book.opf"/></rootfiles></container>')
        z.writestr('OPS/book.opf', f'''<package xmlns:dc="http://purl.org/dc/elements/1.1/">
          <metadata><dc:title>Ruang Kecil</dc:title><dc:creator>Penulis</dc:creator><dc:language>id</dc:language></metadata>
          <manifest><item id="front" href="front.xhtml" media-type="application/xhtml+xml"/>
          <item id="ch1" href="{chapter_name}" media-type="application/xhtml+xml"/>
          <item id="cover" href="cover.png" media-type="image/png" properties="cover-image"/></manifest>
          <spine><itemref idref="front"/><itemref idref="ch1"/></spine></package>''')
        z.writestr('OPS/front.xhtml', '<html><body epub:type="titlepage" xmlns:epub="http://www.idpf.org/2007/ops"><h1>Ruang Kecil</h1><p>Penulis</p></body></html>')
        z.writestr('OPS/' + chapter_name, '<html><body><h1>Episode 1</h1><p>Halo dunia.</p>' + extra + '</body></html>')
        z.writestr('OPS/cover.png', b'\x89PNG\r\n\x1a\nimage')


class PickerTests(unittest.TestCase):
    def test_epubs_only_and_no_recursive_scan(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for i in range(2000):
                (root / f'photo-{i}.jpg').touch()
            (root / 'novel.EPUB').touch()
            (root / 'empty').mkdir()
            (root / 'books').mkdir()
            (root / 'books' / 'child.epub').touch()
            (root / 'deep').mkdir()
            (root / 'deep' / 'nested').mkdir()
            (root / 'deep' / 'nested' / 'secret.epub').touch()
            result = kk.scan_folder(root)
            self.assertEqual([p.name for p in result['files']], ['novel.EPUB'])
            self.assertEqual([p.name for p in result['folders']], ['books'])
            self.assertNotIn('secret.epub', str(result))

    def test_epub_filter_checks_suffix_and_does_not_open_contents(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'real.epub').touch()
            (root / 'fake.epub.zip').touch()
            (root / 'folder.epub').mkdir()
            with patch.object(Path, 'read_bytes', side_effect=AssertionError('opened a file')):
                self.assertEqual([p.name for p in kk.scan_folder(root)['files']], ['real.epub'])

    def test_recursive_search_is_explicit_and_skips_symlink_loops(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'sub').mkdir()
            (root / 'sub' / 'yes.epub').touch()
            (root / 'sub' / 'loop').symlink_to(root, target_is_directory=True)
            self.assertEqual(list(kk.search_epubs(root)), [root / 'sub' / 'yes.epub'])

    def test_paging_and_search(self):
        paths = [Path(f'Cerita {n}.epub') for n in range(50)]
        self.assertEqual(len(kk.filter_page(paths, '', 0)), 12)
        self.assertEqual(kk.filter_page(paths, 'CERITA 49', 0), [paths[49]])


class EpubTests(unittest.TestCase):
    def large_image_epub(self, path, size, copies=1):
        fixture(path, extra='<img src="../cover.png"/>' * copies)
        with zipfile.ZipFile(path) as z:
            data = {name: z.read(name) for name in z.namelist()}
        data['OPS/cover.png'] = b'\x89PNG\r\n\x1a\n' + b'x' * (size - 8)
        with zipfile.ZipFile(path, 'w', compression=zipfile.ZIP_DEFLATED) as z:
            for name, raw in data.items():
                z.writestr(name, raw)

    def test_accepts_ten_mb_image_and_cover_without_losing_text(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'large.epub'
            self.large_image_epub(path, 10_000_000)
            _, sections, cover = kk.read_epub(path, 'book')
            self.assertEqual(len(cover[0]), 10_000_000)
            self.assertIn('Halo dunia.', sections[1]['content_html'])
            self.assertIn('data:image/png;base64,', sections[1]['content_html'])

    def test_rejects_image_over_ten_mb_with_filename(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'large.epub'
            self.large_image_epub(path, 10_000_001)
            with self.assertRaisesRegex(ValueError, r'cover.png.*10 MB'):
                kk.read_epub(path, 'book')

    def test_rejects_combined_content_that_cannot_fit_the_reader(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'large.epub'
            self.large_image_epub(path, 7_000_000, copies=2)
            with self.assertRaisesRegex(ValueError, '16 MB'):
                kk.read_epub(path, 'book')

    def test_standard_xhtml_doctype_is_not_fetched_and_svg_cover_is_inlined(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'book.epub'
            fixture(path, extra='<svg xmlns:xlink="http://www.w3.org/1999/xlink"><image xlink:href="../cover.png"/></svg>')
            with zipfile.ZipFile(path) as z:
                data = {name:z.read(name) for name in z.namelist()}
            data['OPS/text/ch1.xhtml'] = b'<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "https://invalid.example/xhtml.dtd">' + data['OPS/text/ch1.xhtml']
            with zipfile.ZipFile(path, 'w') as z:
                for name, raw in data.items():
                    z.writestr(name, raw)
            _, sections, _ = kk.read_epub(path, 'book')
            self.assertIn('data:image/png;base64,', sections[1]['content_html'])
            self.assertNotIn('<image', sections[1]['content_html'])

    def test_metadata_cover_and_front_matter(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'novel.epub'
            fixture(path)
            book, sections, cover = kk.read_epub(path, 'ruang-kecil')
            self.assertEqual(book['title'], 'Ruang Kecil')
            self.assertEqual(book['author'], 'Penulis')
            self.assertEqual(cover[1], 'image/png')
            self.assertEqual([s['kind'] for s in sections], ['page', 'episode'])
            self.assertEqual(sections[1]['source_path'], 'OPS/text/ch1.xhtml')

    def test_archive_traversal_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'bad.epub'
            fixture(path)
            with zipfile.ZipFile(path, 'a') as z:
                z.writestr('../evil', 'x')
            with self.assertRaisesRegex(ValueError, 'arsip'):
                kk.read_epub(path, 'book')

    def test_script_and_external_entities_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'bad.epub'
            fixture(path, extra='<script>alert(1)</script>')
            with self.assertRaisesRegex(ValueError, 'script'):
                kk.read_epub(path, 'book')

    def test_spine_over_600_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'bad.epub'
            fixture(path)
            with zipfile.ZipFile(path) as z:
                data = {name: z.read(name) for name in z.namelist()}
            data['OPS/book.opf'] = data['OPS/book.opf'].replace(b'<itemref idref="ch1"/>', b'<itemref idref="ch1"/>' * 601)
            with zipfile.ZipFile(path, 'w') as z:
                for name, raw in data.items():
                    z.writestr(name, raw)
            with self.assertRaises(ValueError):
                kk.read_epub(path, 'book')

    def test_existing_section_id_kept_after_internal_path_rename(self):
        old = [dict(id='old-id', title='Episode 1', content_html='<p>Teks lama.</p>', position=0, release_at='2030-01-01T12:00:00Z', is_enabled=True)]
        new = [dict(id='new-id', title='Episode 1', content_html='<p>Teks baru.</p>', position=0, source_path='new/ch1.xhtml', kind='episode')]
        result, changes = kk.reconcile_sections(new, old)
        self.assertEqual(result[0]['id'], 'old-id')
        self.assertEqual(result[0]['release_at'], '2030-01-01T12:00:00Z')
        self.assertEqual(changes['updated'], 1)

    def test_ambiguous_duplicate_titles_do_not_silently_remap(self):
        old = [dict(id='a', title='Bagian', position=0), dict(id='b', title='Bagian', position=1)]
        new = [dict(id='c', title='Bagian', position=0, source_path='x')]
        _, changes = kk.reconcile_sections(new, old)
        self.assertEqual(changes['ambiguous'], ['Bagian'])


class ScheduleTests(unittest.TestCase):
    def test_front_matter_does_not_consume_episode_slot(self):
        now = dt.datetime(2026, 10, 30, 12, 0, tzinfo=kk.WIB)
        sections = [dict(kind='page'), dict(kind='episode'), dict(kind='episode'), dict(kind='episode')]
        kk.plan_schedule(sections, initial=1, weekdays=[3, 6], hour='19:00', start='2026-10-30', batch=1, now=now)
        self.assertEqual(sections[0]['release_at'], now.isoformat())
        self.assertEqual(sections[1]['release_at'], now.isoformat())
        self.assertEqual(sections[2]['release_at'], '2026-11-01T19:00:00+07:00')
        self.assertEqual(sections[3]['release_at'], '2026-11-05T19:00:00+07:00')

    def test_multiple_episodes_per_release_and_past_slots_skipped(self):
        now = dt.datetime(2026, 11, 1, 20, 0, tzinfo=kk.WIB)
        sections = [dict(kind='episode') for _ in range(3)]
        kk.plan_schedule(sections, 0, [6], '19:00', '2026-11-01', 2, now)
        self.assertEqual(sections[0]['release_at'], '2026-11-08T19:00:00+07:00')
        self.assertEqual(sections[0]['release_at'], sections[1]['release_at'])
        self.assertEqual(sections[2]['release_at'], '2026-11-15T19:00:00+07:00')

    def test_update_keeps_old_schedule_new_sections_remain_disabled(self):
        new = [dict(id='a', title='A', content_html='a', position=0), dict(id='b', title='B', content_html='b', position=1)]
        old = [dict(id='a', title='A', content_html='a', position=0, release_at='2030-01-01T12:00:00Z', is_enabled=True)]
        merged, _ = kk.reconcile_sections(new, old)
        self.assertEqual(merged[0]['release_at'], old[0]['release_at'])
        self.assertFalse(merged[1]['is_enabled'])

    def test_invalid_schedule_rejected(self):
        for days, hour, batch in [([], '19:00', 1), ([7], '19:00', 1), ([3], '25:00', 1), ([3], '19:00', 0)]:
            with self.subTest(days=days, hour=hour, batch=batch), self.assertRaises(ValueError):
                kk.plan_schedule([dict(kind='episode')], 0, days, hour, '2026-11-01', batch)


class ConfigTests(unittest.TestCase):
    def test_combined_content_is_rejected_before_creating_upload_payload(self):
        sections = [{'content_html': 'x' * 8_000_001}, {'content_html': 'y' * 8_000_001}]
        with self.assertRaisesRegex(ValueError, 'gabungan.*16 MB'):
            kk.publication_payload({'id': 'book'}, sections)

    def test_private_atomic_config_and_no_password(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'config.json'
            kk.save_json(path, {'token': 'example'})
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            self.assertEqual(json.loads(path.read_text()), {'token': 'example'})

    def test_slug_unicode_fallback_and_spaces(self):
        self.assertEqual(kk.slugify('Ruang Kecil!'), 'ruang-kecil')
        self.assertTrue(kk.slugify('日本語'))

    def test_payload_strips_local_metadata(self):
        section = dict(id='x', position=0, title='A', content_html='<p>A</p>', release_at='2030-01-01T00:00:00Z', is_enabled=False, kind='episode', source_path='a.xhtml')
        payload = kk.publication_payload({'id':'a','title':'A'}, [section])
        self.assertNotIn('source_path', payload['sections'][0])
        self.assertNotIn('kind', payload['sections'][0])


class TerminalTests(unittest.TestCase):
    def test_panels_and_filenames_fit_narrow_and_wide_terminals(self):
        for width in (28, 40, 80):
            with self.subTest(width=width), patch.object(kk.shutil, 'get_terminal_size', return_value=os.terminal_size((width, 24))), patch.object(kk, 'COLOR', False):
                output = io.StringIO()
                with redirect_stdout(output):
                    kk.panel('KATA KECIL', ['Studio Terminal ' + kk.VERSION, 'Batas gambar dalam isi dan sampul 10 MB'])
                    kk.menu_row('12', 'Garis_yang_Kita_Teruskan_Karisyono_Final_45_Bab.epub')
                self.assertTrue(all(kk.visible_width(line) <= width for line in output.getvalue().splitlines()))
                self.assertIn('.epub', output.getvalue())
                self.assertNotIn('\x1b', output.getvalue())

    def test_piped_home_and_inspect_are_noninteractive_and_secret_free(self):
        output = io.StringIO()
        with patch.object(kk, 'load_config', return_value={'token': 'private-token'}), patch.object(kk.sys, 'argv', ['kk']), patch('builtins.input', return_value='0'), redirect_stdout(output):
            kk.main()
        self.assertIn('Upload EPUB', output.getvalue())
        self.assertNotIn('private-token', output.getvalue())
        self.assertNotIn('\x1b', output.getvalue())

    def test_data_uri_images_obey_the_same_ten_mb_limit(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'large.epub'
            encoded = 'eA==' * 1  # Valid small embedded image.
            fixture(path, extra=f'<img src="data:image/png;base64,{encoded}"/>')
            _, sections, _ = kk.read_epub(path, 'book')
            self.assertIn('data:image/png;base64,eA==', sections[1]['content_html'])
            fixture(path, extra='<img src="data:image/png;base64,' + 'eHh4' * 3_333_334 + '"/>')
            with self.assertRaisesRegex(ValueError, '10 MB'):
                kk.read_epub(path, 'book')


if __name__ == '__main__':
    unittest.main()
