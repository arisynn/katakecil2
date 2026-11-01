#!/usr/bin/env python3
"""Kata Kecil publisher. Python standard library only; independent of the reader."""
import argparse
import base64
import datetime as dt
import hashlib
import json
import mimetypes
import os
import posixpath
import re
import sys
import tempfile
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import uuid
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

VERSION = '1.0.0'
WIB = dt.timezone(dt.timedelta(hours=7), 'WIB')
CONFIG = Path.home() / '.config' / 'katakecil' / 'config.json'
DEFAULT_URL = 'https://hrbcwymdqigtfmpmsdsi.supabase.co'
DEFAULT_KEY = 'sb_publishable_lttlEUXKFSzkOk9Jizy8TQ_dXdS1ex-'
PAGE_SIZE = 12
DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
COLOR = sys.stdout.isatty() and 'NO_COLOR' not in os.environ


def say(message, color='36'):
    print(f'\033[{color}m{message}\033[0m' if COLOR else message)


def save_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd, tmp = tempfile.mkstemp(prefix='.kk-', dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.chmod(tmp, 0o600)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def load_config():
    if not CONFIG.exists():
        return {}
    return json.loads(CONFIG.read_text(encoding='utf-8'))


def is_epub(entry):
    return entry.name.lower().endswith('.epub') and entry.is_file(follow_symlinks=False)


def scan_folder(folder):
    """Read one directory, and one shallow listing per child. Never open EPUBs here."""
    files, folders = [], []
    with os.scandir(folder) as entries:
        for entry in entries:
            if entry.name.startswith('.'):
                continue
            try:
                if is_epub(entry):
                    files.append(Path(entry.path))
                elif entry.is_dir(follow_symlinks=False):
                    try:
                        with os.scandir(entry.path) as children:
                            if any(is_epub(child) for child in children):
                                folders.append(Path(entry.path))
                    except (PermissionError, FileNotFoundError):
                        pass
            except FileNotFoundError:
                pass
    key = lambda path: path.name.casefold()
    return {'files': sorted(files, key=key), 'folders': sorted(folders, key=key)}


def search_epubs(folder):
    """Explicit recursive search; symlinks and hidden folders are excluded."""
    def ignore(_):
        pass
    for root, dirs, files in os.walk(folder, followlinks=False, onerror=ignore):
        dirs[:] = sorted(d for d in dirs if not d.startswith('.') and not (Path(root) / d).is_symlink())
        for name in sorted(files):
            path = Path(root) / name
            if name.lower().endswith('.epub') and not path.is_symlink():
                yield path


def filter_page(paths, query, page):
    found = [p for p in paths if query.casefold() in p.name.casefold()]
    return found[page * PAGE_SIZE:(page + 1) * PAGE_SIZE]


def prompt(label, default=None):
    value = input(f'{label}' + (f' [{default}]' if default is not None else '') + ': ').strip()
    return value if value else default


def number(label, default, low=0, high=600):
    while True:
        value = prompt(label, str(default))
        if value and value.isdigit() and low <= int(value) <= high:
            return int(value)
        say(f'Masukkan angka {low}–{high}.', '33')


def confirm(label):
    return str(prompt(label + ' (y/t)', 't')).casefold() in ('y', 'ya')


def pick_epub(config):
    default = Path.home() / 'storage' / 'shared' / 'Download'
    folder = Path(config.get('last_folder', str(default))).expanduser()
    if not folder.is_dir():
        folder = default if default.is_dir() else Path.home()
    paths = None
    page, query = 0, ''
    while True:
        if paths is None:
            listing = scan_folder(folder)
            candidates = listing['folders'] + listing['files']
        else:
            candidates = paths
        filtered = [p for p in candidates if query.casefold() in p.name.casefold()]
        page = min(page, max(0, (len(filtered) - 1) // PAGE_SIZE))
        shown = filter_page(candidates, query, page)
        say(f'\nPilih EPUB · {folder}')
        for index, path in enumerate(shown, 1):
            suffix = '/' if path.is_dir() else ''
            print(f'  {index:2}. {path.name}{suffix}')
        if not shown:
            print('  Belum ada EPUB di daftar ini.')
        print(f'Halaman {page + 1}/{max(1, (len(filtered) + PAGE_SIZE - 1) // PAGE_SIZE)} · {len(filtered)} hasil')
        print('n Berikut · p Sebelum · / Cari nama · l Lokasi lain')
        print('s Cari EPUB di subfolder · u Folder induk · 0 Kembali')
        choice = str(prompt('Pilih', '0'))
        if choice == '0':
            return None
        if choice == 'n':
            page += 1
        elif choice == 'p':
            page = max(0, page - 1)
        elif choice.startswith('/'):
            query = choice[1:] or str(prompt('Nama EPUB', ''))
            page = 0
        elif choice in ('l', 'u'):
            target = folder.parent if choice == 'u' else Path(str(prompt('Lokasi file/folder', str(folder))).strip('"\'')).expanduser()
            if target.is_file() and target.suffix.lower() == '.epub':
                config['last_folder'] = str(target.parent)
                save_json(CONFIG, config)
                return target
            if target.is_dir():
                folder, paths, page, query = target, None, 0, ''
            else:
                say('Pilih file .epub atau folder yang tersedia.', '33')
        elif choice == 's':
            say('Mencari EPUB di subfolder pilihan ini. Ctrl+C untuk berhenti.')
            found = []
            try:
                for path in search_epubs(folder):
                    found.append(path)
                    if len(found) % 25 == 0:
                        print(f'  {len(found)} EPUB ditemukan…', end='\r', flush=True)
                paths, page, query = found, 0, ''
            except KeyboardInterrupt:
                say('\nPencarian dihentikan; kembali ke folder.', '33')
        elif choice.isdigit() and 1 <= int(choice) <= len(shown):
            target = shown[int(choice) - 1]
            if target.is_dir():
                folder, paths, page, query = target, None, 0, ''
            else:
                config['last_folder'] = str(target.parent)
                save_json(CONFIG, config)
                return target


def slugify(value):
    ascii_text = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode().lower()
    slug = re.sub(r'[^a-z0-9]+', '-', ascii_text).strip('-')[:100]
    return slug or 'buku-' + uuid.uuid4().hex[:8]


def local_path(base, href):
    parsed = urllib.parse.urlsplit(href)
    if parsed.scheme or parsed.netloc or '\\' in href:
        raise ValueError('EPUB memuat sumber eksternal yang tidak didukung.')
    path = posixpath.normpath(posixpath.join(posixpath.dirname(base), urllib.parse.unquote(parsed.path)))
    if path.startswith('../') or path.startswith('/'):
        raise ValueError('Lokasi sumber keluar dari arsip EPUB.')
    return path


def read_epub(path, book_id):
    path = Path(path)
    if path.stat().st_size > 18_000_000:
        raise ValueError('Ukuran EPUB maksimal 18 MB untuk reader ini.')
    with zipfile.ZipFile(path) as archive:
        entries = archive.infolist()
        if len(entries) > 2000 or sum(e.file_size for e in entries) > 70_000_000:
            raise ValueError('Ukuran isi arsip EPUB terlalu besar.')
        names = [e.filename for e in entries]
        if len(names) != len(set(names)):
            raise ValueError('Nama file ganda dalam arsip EPUB.')
        for entry in entries:
            if entry.flag_bits & 1 or entry.filename.startswith('/') or '..' in entry.filename.split('/') or '\\' in entry.filename:
                raise ValueError('Struktur arsip EPUB tidak aman.')
        if 'META-INF/encryption.xml' in names:
            raise ValueError('EPUB terenkripsi/DRM belum didukung.')

        def xml(name):
            raw = archive.read(name)
            upper = raw.upper()
            if b'<!ENTITY' in upper:
                raise ValueError('Entitas XML eksternal tidak didukung.')
            # Standard XHTML doctypes are common in EPUB 2. Strip declarations;
            # never resolve their external DTDs.
            raw = re.sub(br'<!DOCTYPE[^>]*>', b'', raw, flags=re.I)
            return ET.fromstring(raw)

        container = xml('META-INF/container.xml')
        opf = next(x.attrib['full-path'] for x in container.iter() if x.tag.endswith('rootfile'))
        if opf.startswith('/') or '..' in opf.split('/'):
            raise ValueError('Lokasi OPF keluar dari arsip EPUB.')
        root = xml(opf)
        def metadata(key, default):
            return next((x.text.strip() for x in root.iter() if x.tag.split('}')[-1] == key and x.text and x.text.strip()), default)
        if any(x.attrib.get('property') == 'rendition:layout' and x.text == 'pre-paginated' for x in root.iter()):
            raise ValueError('Gunakan EPUB reflowable untuk penerbitan episode.')
        manifest = {x.attrib['id']: (local_path(opf, x.attrib['href']), x) for x in root.iter() if x.tag.split('}')[-1] == 'item'}
        spine = [manifest[x.attrib['idref']][0] for x in root.iter() if x.tag.split('}')[-1] == 'itemref' and x.attrib.get('linear') != 'no']
        if not 1 <= len(spine) <= 600 or len(spine) != len(set(spine)):
            raise ValueError('EPUB harus berisi 1–600 bagian unik.')
        ids = {name: str(uuid.uuid5(uuid.NAMESPACE_URL, 'katakecil:' + book_id + ':' + name)) for name in spine}
        cover_id = next((x.attrib.get('content') for x in root.iter() if x.attrib.get('name') == 'cover'), None)
        cover_entry = next((v for k, v in manifest.items() if 'cover-image' in v[1].attrib.get('properties', '').split() or k == cover_id), None)
        cover = None
        if cover_entry:
            cover_name, element = cover_entry
            mime = element.attrib.get('media-type', '')
            if mime in ('image/png', 'image/jpeg', 'image/webp'):
                raw = archive.read(cover_name)
                if len(raw) <= 5_000_000:
                    cover = (raw, mime)
        sections = []
        front_types = {'titlepage', 'copyright-page', 'dedication', 'acknowledgments', 'preface', 'foreword', 'toc', 'cover', 'halftitlepage', 'imprint'}
        for position, name in enumerate(spine):
            document = xml(name)
            body = next(x for x in document.iter() if x.tag.split('}')[-1] == 'body')
            types = set()
            for element in document.iter():
                types.update(element.attrib.get('{http://www.idpf.org/2007/ops}type', '').split())
            heading = next((x for x in body.iter() if x.tag.split('}')[-1] in ('h1', 'h2', 'h3')), None)
            title = ''.join(heading.itertext()).strip() if heading is not None else ''
            if not title:
                title = next((''.join(x.itertext()).strip() for x in document.iter() if x.tag.split('}')[-1] == 'title'), '') or f'Bagian {position + 1}'
            title = re.sub(r'\s+', ' ', title)[:300]
            front_name = re.search(r'(^|[/_.-])(cover|titlepage|copyright|toc|pengantar|prakata|daftar[-_ ]?isi)([_.-]|$)', name, re.I)
            kind = 'page' if types & front_types or front_name else 'episode'
            for element in body.iter():
                element.tag = element.tag.split('}')[-1]
                # A common cover page is an SVG wrapper around a raster image.
                if element.tag == 'svg':
                    element.tag = 'div'
                elif element.tag == 'image':
                    source = element.attrib.pop('{http://www.w3.org/1999/xlink}href', None) or element.attrib.pop('href', None)
                    if source:
                        element.tag = 'img'
                        element.set('src', source)
                if element.tag.lower() in ('script', 'iframe', 'object', 'embed', 'form'):
                    raise ValueError('EPUB memuat script atau elemen aktif yang tidak didukung.')
                for attr in list(element.attrib):
                    if attr.lower().startswith('on'):
                        del element.attrib[attr]
                if element.tag == 'img' and element.attrib.get('src'):
                    source = element.attrib['src']
                    if not source.startswith('data:'):
                        resource = local_path(name, source)
                        mime = mimetypes.guess_type(resource)[0]
                        if mime not in ('image/png', 'image/jpeg', 'image/webp', 'image/gif'):
                            element.attrib.pop('src', None)
                        else:
                            raw = archive.read(resource)
                            if len(raw) > 1_500_000:
                                raise ValueError('Satu gambar dalam isi EPUB melebihi 1,5 MB.')
                            element.set('src', 'data:' + mime + ';base64,' + base64.b64encode(raw).decode())
                if element.tag == 'a' and element.attrib.get('href'):
                    href = element.attrib['href']
                    if not href.startswith('#'):
                        try:
                            target = local_path(name, href)
                            if target not in ids:
                                raise ValueError('unknown target')
                            fragment = urllib.parse.urlsplit(href).fragment
                            element.set('href', 'section-' + ids[target] + '.xhtml' + ('#' + fragment if fragment else ''))
                        except ValueError:
                            element.attrib.pop('href', None)
            html = (body.text or '') + ''.join(ET.tostring(x, encoding='unicode') for x in body)
            if len(html.encode()) > 3_000_000:
                raise ValueError(f'Isi bagian {title} melebihi 3 MB.')
            sections.append(dict(id=ids[name], position=position, title=title, content_html=html, source_path=name, kind=kind, is_enabled=True))
        book = dict(id=book_id, title=metadata('title', path.stem)[:300], author=metadata('creator', 'Kata Kecil')[:300], language=metadata('language', 'id'), synopsis=metadata('description', '')[:10000], status='ongoing', is_published=False)
        return book, sections, cover


def reconcile_sections(sections, previous):
    old_ids = {s['id']: s for s in previous}
    old_titles = {}
    for section in previous:
        old_titles.setdefault(section['title'].casefold().strip(), []).append(section)
    new_titles = {}
    for section in sections:
        key = section['title'].casefold().strip()
        new_titles[key] = new_titles.get(key, 0) + 1
    used, remap = set(), {}
    changes = dict(added=0, updated=0, removed=0, ambiguous=[])
    for section in sections:
        old = old_ids.get(section['id'])
        key = section['title'].casefold().strip()
        if old is None and key in old_titles:
            matches = old_titles[key]
            if len(matches) == 1 and new_titles[key] == 1 and matches[0]['id'] not in used:
                old = matches[0]
                remap[section['id']] = old['id']
                section['id'] = old['id']
            else:
                changes['ambiguous'].append(section['title'])
        if old:
            used.add(old['id'])
            section['release_at'] = old.get('release_at', dt.datetime.now(WIB).isoformat())
            section['is_enabled'] = old.get('is_enabled', True)
            section['kind'] = old.get('kind', section.get('kind', 'episode'))
            changes['updated'] += (section['content_html'] != old.get('content_html') or section['title'] != old['title'])
        else:
            section['release_at'] = dt.datetime.now(WIB).isoformat()
            # New chapters in a revision must not accidentally publish immediately.
            section['is_enabled'] = False
            changes['added'] += 1
    for section in sections:
        for new_id, old_id in remap.items():
            section['content_html'] = section['content_html'].replace('section-' + new_id + '.xhtml', 'section-' + old_id + '.xhtml')
    changes['removed'] = sum(s['id'] not in used for s in previous)
    return sections, changes


def plan_schedule(sections, initial=0, weekdays=None, hour='19:00', start=None, batch=1, now=None):
    weekdays = [3, 6] if weekdays is None else weekdays
    if not weekdays or any(d not in range(7) for d in weekdays) or batch < 1 or initial < 0:
        raise ValueError('Hari, jumlah episode, atau jumlah rilis tidak valid.')
    release_time = dt.time.fromisoformat(hour)
    if release_time.tzinfo is not None:
        raise ValueError('Masukkan jam WIB seperti 19:00.')
    now = (now or dt.datetime.now(WIB)).astimezone(WIB)
    date = dt.date.fromisoformat(start) if start else now.date()
    date = max(date, now.date())
    episode = 0
    slot_count = batch
    slot = None
    for section in sections:
        section['is_enabled'] = True
        if section.get('kind') == 'page' or episode < initial:
            section['release_at'] = now.isoformat()
            if section.get('kind') != 'page':
                episode += 1
            continue
        if slot_count >= batch:
            while True:
                candidate = dt.datetime.combine(date, release_time, WIB)
                date += dt.timedelta(days=1)
                if candidate.weekday() in weekdays and candidate > now:
                    slot = candidate
                    slot_count = 0
                    break
        section['release_at'] = slot.isoformat()
        slot_count += 1
        episode += 1


def publication_payload(book, sections, expected=None):
    keys = ('id', 'position', 'title', 'content_html', 'is_enabled', 'release_at')
    return dict(book=book, sections=[{k: s[k] for k in keys} for s in sections], kinds={s['id']:s.get('kind', 'episode') for s in sections}, expected_updated_at=expected)


class Client:
    def __init__(self, config):
        self.config = config
        self.url = config.get('url', DEFAULT_URL).rstrip('/')
        if urllib.parse.urlsplit(self.url).scheme != 'https':
            raise ValueError('Alamat Supabase harus memakai HTTPS.')

    def request(self, action, payload=None, raw=None, mime='application/json', params=None):
        token = self.config.get('token')
        if not token:
            raise ValueError('Akses penerbit belum diatur. Buka Pengaturan atau pasang file aktivasi.')
        query = urllib.parse.urlencode({'action': action, **(params or {})})
        url = self.url + '/functions/v1/katakecil-publisher?' + query
        body = raw if raw is not None else (json.dumps(payload, ensure_ascii=False).encode() if payload is not None else None)
        headers = {'apikey': self.config.get('key', DEFAULT_KEY), 'Authorization': 'Bearer ' + token, 'Content-Type': mime}
        for attempt in range(3):
            req = urllib.request.Request(url, data=body, headers=headers, method='POST' if body is not None else 'GET')
            try:
                with urllib.request.urlopen(req, timeout=120) as response:
                    return json.loads(response.read().decode())
            except urllib.error.HTTPError as error:
                if error.code in (429, 502, 503, 504) and attempt < 2:
                    time.sleep(attempt + 1)
                    continue
                messages = {401:'Akses penerbit tidak berlaku. Periksa aktivasi di Pengaturan.', 403:'Akses penerbit dinonaktifkan.', 409:'Buku berubah atau unggahan sudah tersimpan. Muat ulang buku sebelum melanjutkan.', 413:'Ukuran unggahan melebihi batas.', 429:'Terlalu banyak permintaan. Coba lagi sebentar.'}
                raise ValueError(messages.get(error.code, f'Permintaan gagal (HTTP {error.code}). Data buku belum dikonfirmasi tersimpan.')) from None
            except (urllib.error.URLError, TimeoutError):
                if attempt < 2:
                    time.sleep(attempt + 1)
                    continue
                raise ValueError('Koneksi terputus. Periksa koleksi sebelum mengulang unggahan.') from None

    def get(self, book_id):
        return self.request('book', params={'id': book_id})

    def upload(self, action, book_id, raw, mime):
        say(f'  Mengunggah {"sampul" if action == "cover" else "EPUB"} · {len(raw) / 1_000_000:.1f} MB…')
        return self.request(action, raw=raw, mime=mime, params={'id': book_id})

    def publish(self, book, sections, expected=None):
        payload = publication_payload(book, sections, expected)
        digest = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        payload['request_id'] = digest
        result = self.request('publish', payload)
        saved = self.get(book['id'])
        # Compare the stored publication instead of assuming an HTTP 200 means success.
        actual = publication_payload({k:saved['book'].get(k) for k in book}, saved['sections'], expected)
        expected_sections = {s['id']: s for s in payload['sections']}
        for section in actual['sections']:
            reference = expected_sections.get(section['id'])
            if not reference or any(section[k] != reference[k] for k in ('title', 'position', 'content_html', 'is_enabled')):
                raise ValueError('Verifikasi isi gagal. Muat ulang buku sebelum mengulangi.')
            left = dt.datetime.fromisoformat(section['release_at'].replace('Z', '+00:00'))
            right = dt.datetime.fromisoformat(reference['release_at'].replace('Z', '+00:00'))
            if left != right:
                raise ValueError('Verifikasi jadwal gagal. Muat ulang buku sebelum mengulangi.')
        if len(actual['sections']) != len(sections) or any(actual['book'][k] != book[k] for k in book):
            raise ValueError('Verifikasi informasi buku gagal. Muat ulang koleksi.')
        return {**result, 'receipt': digest[:12]}


def preview(sections):
    page = 0
    while True:
        say('\nSusunan isi dan jadwal · WIB')
        for i, section in enumerate(sections[page * PAGE_SIZE:(page + 1) * PAGE_SIZE], page * PAGE_SIZE + 1):
            release = section.get('release_at')
            label = dt.datetime.fromisoformat(release.replace('Z', '+00:00')).astimezone(WIB).strftime('%d-%m-%Y %H:%M') if release else 'belum diatur'
            if not section.get('is_enabled', True):
                label = 'ditahan'
            kind = 'halaman' if section.get('kind') == 'page' else 'episode'
            print(f'{i:3}. {section["title"]}\n     {kind} · {label}')
        choice = prompt('n Berikut · p Sebelum · 0 Selesai', '0')
        if choice == 'n' and (page + 1) * PAGE_SIZE < len(sections):
            page += 1
        elif choice == 'p':
            page = max(0, page - 1)
        elif choice == '0':
            return


def review_kinds(sections):
    preview(sections)
    print('Bagian awal dideteksi dari EPUB; periksa halaman buku sebelum menjadwalkan.')
    while True:
        choice = prompt('Nomor bagian untuk ubah halaman/episode, 0 selesai', '0')
        if choice == '0':
            return
        if choice and choice.isdigit() and 1 <= int(choice) <= len(sections):
            section = sections[int(choice) - 1]
            section['kind'] = 'episode' if section.get('kind') == 'page' else 'page'
            print(section['title'], '→', section['kind'])


def edit_metadata(book):
    for key, label in [('title', 'Judul'), ('author', 'Penulis'), ('synopsis', 'Sinopsis'), ('language', 'Bahasa')]:
        book[key] = prompt(label, book.get(key, ''))
    choice = number('Status: 1 Berjalan · 2 Tamat · 3 Hiatus', 1, 1, 3)
    book['status'] = ['ongoing', 'completed', 'hiatus'][choice - 1]


def choose_schedule(sections, existing=False):
    print('\n1. Terbit lengkap\n2. Terbit bertahap\n3. Simpan draf' + ('\n4. Pertahankan jadwal' if existing else ''))
    choice = number('Penerbitan', 4 if existing else 2, 1, 4 if existing else 3)
    if choice == 4:
        return None
    now = dt.datetime.now(WIB).isoformat()
    if choice in (1, 3):
        for section in sections:
            section['release_at'], section['is_enabled'] = now, True
        return choice == 1
    initial = number('Episode langsung terbit', 0)
    value = str(prompt('Hari: 1 Senin … 7 Minggu (pisahkan koma)', '4,7'))
    try:
        days = sorted(set(int(d.strip()) - 1 for d in value.split(',')))
    except ValueError:
        raise ValueError('Hari harus berupa angka 1–7, misalnya 4,7.') from None
    hour = prompt('Jam WIB', '19:00')
    start = prompt('Tanggal mulai (YYYY-MM-DD)', dt.datetime.now(WIB).date().isoformat())
    batch = number('Jumlah episode setiap rilis', 1, 1)
    plan_schedule(sections, initial, days, hour, start, batch)
    return True


def overrides(sections):
    while True:
        choice = prompt('Ubah tanggal bagian tertentu? Nomor bagian, 0 selesai', '0')
        if choice == '0':
            return
        if choice and choice.isdigit() and 1 <= int(choice) <= len(sections):
            section = sections[int(choice) - 1]
            value = prompt(f'{section["title"]}: YYYY-MM-DD HH:MM atau tahan')
            if value == 'tahan':
                section['is_enabled'] = False
            else:
                date = dt.datetime.strptime(str(value), '%Y-%m-%d %H:%M').replace(tzinfo=WIB)
                section['release_at'], section['is_enabled'] = date.isoformat(), True


def choose_book(client):
    books = client.request('list')['books']
    if not books:
        say('Belum ada buku. Gunakan Upload EPUB.', '33')
        return None
    query, page = '', 0
    while True:
        found = [b for b in books if query.casefold() in b['title'].casefold()]
        page = min(page, max(0, (len(found) - 1) // PAGE_SIZE))
        shown = found[page * PAGE_SIZE:(page + 1) * PAGE_SIZE]
        for i, book in enumerate(shown, 1):
            print(f'{i}. {book["title"]} · {"terbit" if book["is_published"] else "draf"}')
        choice = str(prompt('Nomor buku · n/p Halaman · / Cari · 0 Kembali', '0'))
        if choice == '0':
            return None
        if choice == 'n':
            page += 1
        elif choice == 'p':
            page = max(0, page - 1)
        elif choice.startswith('/'):
            query, page = choice[1:], 0
        elif choice.isdigit() and 1 <= int(choice) <= len(shown):
            return client.get(shown[int(choice) - 1]['id'])


def upload_flow(config, update=False):
    client = Client(config)
    previous = choose_book(client) if update else None
    if update and not previous:
        return
    path = pick_epub(config)
    if path is None:
        return
    say('Memeriksa EPUB…')
    book_id = previous['book']['id'] if previous else slugify(path.stem)
    book, sections, cover = read_epub(path, book_id)
    if previous:
        book = {**previous['book'], **{k:book[k] for k in ('title','author','language')}}
        book.pop('updated_at', None)
        sections, changes = reconcile_sections(sections, previous['sections'])
        say(f'Perubahan: {changes["added"]} baru · {changes["updated"]} berubah · {changes["removed"]} dihapus')
        if changes['ambiguous']:
            raise ValueError('Judul bagian ganda tidak bisa dicocokkan otomatis: ' + ', '.join(changes['ambiguous']) + '. Pertahankan nama file internal EPUB atau beri judul unik.')
        if changes['removed'] and not confirm('EPUB ini akan menghapus bagian yang tidak ada. Lanjutkan'):
            return
    else:
        books = client.request('list')['books']
        if any(b['id'] == book_id for b in books):
            raise ValueError('Buku dengan ID ini sudah ada. Pilih Update cerita agar jadwal tidak tertimpa.')
    say(f'\n{book["title"]} · {book["author"]}')
    print(f'{len(sections)} bagian · Sampul {"tersedia" if cover else "belum ada"}')
    while True:
        choice = number('1 Lanjut · 2 Edit info · 3 Tinjau isi · 4 Ganti sampul · 0 Batal', 1, 0, 4)
        if choice == 0:
            return
        if choice == 1:
            break
        if choice == 2:
            edit_metadata(book)
        elif choice == 3:
            review_kinds(sections)
        elif choice == 4:
            target = Path(str(prompt('Lokasi JPG/PNG/WebP')).strip('"\'')).expanduser()
            mime = mimetypes.guess_type(target)[0]
            if mime not in ('image/png', 'image/jpeg', 'image/webp') or target.stat().st_size > 5_000_000:
                raise ValueError('Sampul harus JPG/PNG/WebP maksimal 5 MB.')
            cover = (target.read_bytes(), mime)
    published = choose_schedule(sections, bool(previous))
    if published is not None:
        book['is_published'] = published
    preview(sections)
    overrides(sections)
    if not confirm('Simpan ' + ('pembaruan' if update else 'buku') + ' ke Kata Kecil'):
        return
    # Publication is the last step: an interrupted file upload cannot expose an unfinished book.
    if cover:
        book['cover_url'] = client.upload('cover', book_id, *cover)['url']
    client.upload('source', book_id, path.read_bytes(), 'application/epub+zip')
    say('Menyimpan isi dan jadwal…')
    result = client.publish(book, sections, previous['book']['updated_at'] if previous else None)
    say(f'Selesai · {book["title"]} · bukti {result["receipt"]}', '32')
    print('Segarkan koleksi di website untuk mengambil pembaruan.')


def manage_flow(config, schedule=False):
    client = Client(config)
    saved = choose_book(client)
    if not saved:
        return
    book, sections = saved['book'].copy(), saved['sections']
    expected = book.pop('updated_at')
    # Preserve classification between sessions using a private local index.
    kinds = config.get('kinds', {}).get(book['id'], {})
    for section in sections:
        section['kind'] = section.get('kind', kinds.get(section['id'], 'episode'))
    if schedule:
        review_kinds(sections)
        result = choose_schedule(sections, True)
        if result is not None:
            book['is_published'] = result
        preview(sections)
        overrides(sections)
    else:
        choice = number('1 Edit info · 2 Terbitkan draf · 3 Tarik ke draf · 4 Lihat jadwal · 0 Kembali', 4, 0, 4)
        if choice == 0:
            return
        if choice == 4:
            preview(sections)
            return
        if choice == 1:
            edit_metadata(book)
        else:
            book['is_published'] = choice == 2
    if not confirm('Simpan perubahan'):
        return
    result = client.publish(book, sections, expected)
    config.setdefault('kinds', {})[book['id']] = {s['id']:s.get('kind', 'episode') for s in sections}
    save_json(CONFIG, config)
    say('Perubahan tersimpan · ' + result['receipt'], '32')


def settings(config):
    print('\n1. Pasang file aktivasi\n2. Atur token penerbit\n3. Cek koneksi\n0. Kembali')
    choice = prompt('Pilih', '0')
    if choice == '1':
        path = Path(str(prompt('Lokasi file aktivasi')).strip('"\'')).expanduser()
        activation = json.loads(path.read_text())
        config.update({k:activation[k] for k in ('url', 'key', 'token') if k in activation})
        save_json(CONFIG, config)
    elif choice == '2':
        import getpass
        config['url'] = prompt('Alamat Supabase', config.get('url', DEFAULT_URL))
        config['key'] = prompt('Publishable key', config.get('key', DEFAULT_KEY))
        config['token'] = getpass.getpass('Token penerbit (disembunyikan): ').strip()
        save_json(CONFIG, config)
    elif choice == '3':
        Client(config).request('status')
        say('Koneksi dan akses penerbit siap.', '32')


def main():
    parser = argparse.ArgumentParser(description='Kata Kecil — upload EPUB dan jadwalkan episode di Termux.')
    parser.add_argument('--version', action='version', version='kk ' + VERSION)
    parser.add_argument('--check', action='store_true', help='Periksa akses penerbit tanpa mengubah buku')
    parser.add_argument('--inspect', type=Path, help='Periksa EPUB secara offline, tanpa upload')
    args = parser.parse_args()
    if args.inspect:
        book, sections, cover = read_epub(args.inspect, slugify(args.inspect.stem))
        print(json.dumps({'book':book, 'sections':[{k:s[k] for k in ('id', 'title', 'kind', 'source_path')} for s in sections], 'cover':bool(cover)}, ensure_ascii=False, indent=2))
        return
    config = load_config()
    if args.check:
        Client(config).request('status')
        say('Koneksi dan akses penerbit siap.', '32')
        return
    while True:
        say('\nKATA KECIL · Studio Terminal ' + VERSION)
        print('1. Upload EPUB\n2. Update cerita\n3. Atur jadwal episode\n4. Kelola buku\n5. Pengaturan\n0. Keluar')
        try:
            choice = prompt('Pilih', '0')
            if choice == '0':
                return
            if choice in ('1', '2'):
                upload_flow(config, choice == '2')
            elif choice in ('3', '4'):
                manage_flow(config, choice == '3')
            elif choice == '5':
                settings(config)
        except KeyboardInterrupt:
            say('\nDibatalkan; kembali ke menu.', '33')
        except (ValueError, OSError, KeyError, StopIteration, zipfile.BadZipFile, ET.ParseError) as error:
            # No raw HTTP payloads or credential values are printed.
            say('Belum selesai: ' + str(error), '31')


if __name__ == '__main__':
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        print('\nSampai jumpa.')
    except (ValueError, OSError, KeyError, StopIteration, zipfile.BadZipFile, ET.ParseError) as error:
        say('Belum selesai: ' + str(error), '31')
        sys.exit(1)
