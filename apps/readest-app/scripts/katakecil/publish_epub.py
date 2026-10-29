#!/usr/bin/env python3
"""Publish a complete EPUB snapshot to Kata Kecil, with optional per-section dates.
Run --help. Credentials are read from the environment and never written to disk.
"""
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
import urllib.error
import urllib.parse
import urllib.request
import uuid
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

DEFAULT_URL = 'https://hrbcwymdqigtfmpmsdsi.supabase.co'


def local_path(base, href):
    parsed = urllib.parse.urlsplit(href)
    if parsed.scheme or parsed.netloc or '\\' in href:
        raise ValueError('External resources are not supported: ' + href)
    path = posixpath.normpath(posixpath.join(posixpath.dirname(base), urllib.parse.unquote(parsed.path)))
    if path.startswith('../') or path.startswith('/'):
        raise ValueError('Resource outside the EPUB')
    return path


def parse_epub(path, book_id, schedule):
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    with zipfile.ZipFile(path) as archive:
        entries = archive.infolist()
        if len(entries) > 2000 or sum(x.file_size for x in entries) > 70000000:
            raise ValueError('EPUB expands beyond the supported size')
        for e in entries:
            if e.flag_bits & 1 or e.filename.startswith('/') or '..' in e.filename.split('/'):
                raise ValueError('Unsafe EPUB archive')
        if 'META-INF/encryption.xml' in archive.namelist():
            raise ValueError('Encrypted EPUB is not supported')
        def xml(name):
            raw = archive.read(name)
            if b'<!ENTITY' in raw.upper() or b'<!DOCTYPE' in raw.upper() and b'SYSTEM' in raw.upper():
                raise ValueError('External XML entities are not supported')
            return ET.fromstring(raw)
        container = xml('META-INF/container.xml')
        opf = next(x.attrib['full-path'] for x in container.iter() if x.tag.endswith('rootfile'))
        root = xml(opf)
        metadata = lambda key, fallback: next((x.text.strip() for x in root.iter() if x.tag.split('}')[-1] == key and x.text and x.text.strip()), fallback)
        if any(x.attrib.get('property') == 'rendition:layout' and x.text == 'pre-paginated' for x in root.iter()):
            raise ValueError('Use a reflowable EPUB')
        manifest = {x.attrib['id']: local_path(opf, x.attrib['href']) for x in root.iter() if x.tag.split('}')[-1] == 'item'}
        spine = [manifest[x.attrib['idref']] for x in root.iter() if x.tag.split('}')[-1] == 'itemref' and x.attrib.get('linear') != 'no']
        if not 1 <= len(spine) <= 600:
            raise ValueError('Use an EPUB with 1–600 sections')
        identities = {name: str(uuid.uuid5(uuid.NAMESPACE_URL, 'katakecil:' + book_id + ':' + name)) for name in spine}
        sections = []
        for position, name in enumerate(spine):
            document = xml(name)
            body = next(x for x in document.iter() if x.tag.split('}')[-1] == 'body')
            heading = next((x for x in body.iter() if x.tag.split('}')[-1] in ('h1','h2','h3')), None)
            title = ''.join(heading.itertext()).strip() if heading is not None else f'Bagian {position + 1}'
            # Inline only local raster images. Source files remain private.
            for element in body.iter():
                element.tag = element.tag.split('}')[-1]
                if element.tag == 'img' and element.attrib.get('src'):
                    source = element.attrib['src']
                    if not source.startswith('data:'):
                        resource = local_path(name, source)
                        mime = mimetypes.guess_type(resource)[0]
                        if mime not in ('image/png','image/jpeg','image/webp','image/gif'):
                            element.attrib.pop('src', None)
                        else:
                            data = archive.read(resource)
                            if len(data) > 1500000:
                                raise ValueError('An image exceeds 1.5 MB')
                            element.set('src', 'data:' + mime + ';base64,' + base64.b64encode(data).decode())
                if element.tag == 'a' and element.attrib.get('href'):
                    href = element.attrib['href']
                    if not href.startswith('#'):
                        try:
                            target = local_path(name, href)
                            if target in identities:
                                fragment = urllib.parse.urlsplit(href).fragment
                                element.set('href', 'section-' + identities[target] + '.xhtml' + ('#' + fragment if fragment else ''))
                            else:
                                element.attrib.pop('href', None)
                        except ValueError:
                            element.attrib.pop('href', None)
            html = (body.text or '') + ''.join(ET.tostring(x, encoding='unicode') for x in body)
            release = schedule.get(name, now)
            dt.datetime.fromisoformat(release.replace('Z', '+00:00'))  # reject invalid dates
            if dt.datetime.fromisoformat(release.replace('Z', '+00:00')).tzinfo is None:
                raise ValueError('Schedule dates must include a timezone, e.g. +07:00')
            sections.append(dict(id=identities[name], position=position, title=title[:300], content_html=html, is_enabled=True, release_at=release))
        return dict(id=book_id, title=metadata('title', path.stem), author=metadata('creator', 'Kata Kecil'), language=metadata('language','id')), sections


def request(url, key, method='POST', payload=None, content_type='application/json'):
    data = payload if isinstance(payload, bytes) else json.dumps(payload).encode()
    headers = {'apikey': key, 'Authorization': 'Bearer ' + key, 'Content-Type': content_type, 'x-upsert': 'true'}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        raise ValueError(f'Publishing failed (HTTP {error.code}). Check publisher permissions and input.') from error


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('epub', type=Path)
    parser.add_argument('--id', required=True, help='Stable book ID; reuse it for every update')
    parser.add_argument('--status', choices=['ongoing','completed','hiatus'], default='ongoing')
    parser.add_argument('--schedule', type=Path, help='JSON object mapping EPUB paths to ISO dates with timezone; omitted paths publish now')
    parser.add_argument('--cover-url', help='HTTPS URL for the published cover')
    parser.add_argument('--draft', action='store_true', help='Keep the whole book private')
    parser.add_argument('--dry-run', action='store_true', help='Inspect metadata only; do not upload')
    args = parser.parse_args()
    if not re.fullmatch(r'[a-z0-9][a-z0-9_-]{0,119}', args.id):
        parser.error('Invalid book ID')
    if args.epub.stat().st_size > 18000000:
        parser.error('EPUB must be at most 18 MB')
    if args.cover_url and not args.cover_url.startswith('https://'):
        parser.error('Use an HTTPS cover URL')
    schedule = json.loads(args.schedule.read_text()) if args.schedule else {}
    book, sections = parse_epub(args.epub, args.id, schedule)
    book.update(status=args.status, is_published=not args.draft, cover_url=args.cover_url)
    if args.dry_run:
        print(json.dumps({'book':book,'sections':[{'path_id':s['id'],'position':s['position'],'title':s['title'],'release_at':s['release_at']} for s in sections]},ensure_ascii=False,indent=2))
        return
    url = os.environ.get('KATAKECIL_SUPABASE_URL', DEFAULT_URL).rstrip('/')
    key = os.environ.get('KATAKECIL_PUBLISHER_KEY')
    if not key:
        parser.error('Set KATAKECIL_PUBLISHER_KEY on your publishing machine. Never put it in the reader or ZIP.')
    raw = args.epub.read_bytes()
    object_path = args.id + '/' + hashlib.sha256(raw).hexdigest() + '.epub'
    # Full sources never receive public URLs.
    request(url + '/storage/v1/object/kk-sources/' + object_path, key, payload=raw, content_type='application/epub+zip')
    request(url + '/rest/v1/rpc/kk_publish_book', key, payload={'book':book,'sections':sections})
    print('Published:', book['title'], '|', args.status, '|', len(sections), 'sections. Future sections remain private.')

if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, zipfile.BadZipFile, ET.ParseError) as error:
        print(str(error),file=sys.stderr)
        sys.exit(1)
