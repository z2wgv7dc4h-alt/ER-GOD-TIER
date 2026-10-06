"""BXF4 reader - the split "BHF4" header / "BDF4" data binder.

Elden Ring stores the menu textures in `menu/hi/00_solo.tpfbhd` + `.tpfbdt`
(the solo TPF archive: one `MENU_Knowledge_<id>.tpf.dcx` per file) rather than
one huge TPF. This is the same BXF4 format Dark Souls 3 uses, different from the
`Data*.bhd` dvdbnd format handled by `dvdbnd.py`.

Header layout (little-endian in Elden Ring):

    0x00  char[4] "BHF4"
    0x04  bool    Unk04
    0x05  bool    Unk05
    0x06  byte[3] 0
    0x09  bool    BigEndian
    0x0A  bool    BitBigEndian (stored inverted)
    0x0B  byte    0
    0x0C  int32   fileCount
    0x10  int64   headerSize (0x40)
    0x18  char[8] version
    0x20  int64   fileHeaderSize
    0x28  int64   0
    0x30  bool    unicode names
    0x31  byte    format (bit-reversed unless BitBigEndian)
    0x32  byte    extended
    0x33  byte    0
    0x34  int32   0
    0x38  int64   hashTableOffset
    0x40  fileCount * fileHeaderSize file headers, then the names

Only the features Elden Ring actually uses are supported (names, ids, optional
compression and 64-bit offsets); big-endian files raise.

The BDF4 data offsets are relative to the start of the BDF4, which is itself
often stored inside a bigger archive: pass a seekable file plus the base offset
of the BDF4 within it.
"""

import struct

from . import dcx


class Entry:
    __slots__ = ("index", "flags", "id", "name", "compressed_size",
                 "uncompressed_size", "data_offset")

    def __init__(self, **kw):
        for k, v in kw.items():
            setattr(self, k, v)

    def __repr__(self):
        return f"<Entry {self.name!r} id={self.id} {self.compressed_size}B>"


def _reverse_bits(byte):
    out = 0
    for i in range(8):
        out = (out << 1) | ((byte >> i) & 1)
    return out


class BXF4:
    """Read a BHF4 header and pull file bytes out of its BDF4 (bytes or file)."""

    def __init__(self, bhd: bytes, bdt=None, bdt_base: int = 0):
        if bhd[:4] != b"BHF4":
            raise ValueError(f"not a BHF4 header (magic {bhd[:4]!r})")
        self.data = bdt
        self.base = bdt_base
        if bhd[9]:
            raise NotImplementedError("big-endian BXF4 is not used by Elden Ring")

        raw_format = bhd[0x31]
        bit_big_endian = bhd[0x0A] == 0
        reverse = bit_big_endian or ((raw_format & 1) and not (raw_format & 0x80))
        fmt = raw_format if reverse else _reverse_bits(raw_format)

        self.file_count = struct.unpack_from("<I", bhd, 0x0C)[0]
        self.version = bhd[0x18:0x20].split(b"\x00", 1)[0].decode("latin1")
        self.file_header_size = struct.unpack_from("<Q", bhd, 0x20)[0]
        self.unicode = bhd[0x30] != 0
        self.extended = bhd[0x32]
        self.has_ids = (fmt & 0x02) != 0
        self.has_names = (fmt & 0x0C) != 0
        self.has_long_offsets = (fmt & 0x10) != 0
        self.has_compression = (fmt & 0x20) != 0

        off = 0x40
        self.entries = []
        for i in range(self.file_count):
            raw_flags = bhd[off]
            flags = raw_flags if bit_big_endian else _reverse_bits(raw_flags)
            off += 8                          # flags + 3 pad + int32 -1
            compressed = struct.unpack_from("<Q", bhd, off)[0]
            off += 8
            uncompressed = -1
            if self.has_compression:
                uncompressed = struct.unpack_from("<Q", bhd, off)[0]
                off += 8
            if self.has_long_offsets:
                data_offset = struct.unpack_from("<Q", bhd, off)[0]
                off += 8
            else:
                data_offset = struct.unpack_from("<I", bhd, off)[0]
                off += 4
            fid = -1
            if self.has_ids:
                fid = struct.unpack_from("<i", bhd, off)[0]
                off += 4
            name_offset = None
            if self.has_names:
                name_offset = struct.unpack_from("<I", bhd, off)[0]
                off += 4
            name = self._name(bhd, name_offset)
            self.entries.append(Entry(index=i, flags=flags, id=fid, name=name,
                                      compressed_size=compressed,
                                      uncompressed_size=uncompressed,
                                      data_offset=data_offset))

    def _name(self, bhd, offset):
        if not offset or offset >= len(bhd):
            return ""
        if self.unicode:
            end = offset
            while end + 1 < len(bhd) and bhd[end:end + 2] != b"\x00\x00":
                end += 2
            return bhd[offset:end].decode("utf-16-le", "replace")
        end = bhd.index(b"\x00", offset)
        return bhd[offset:end].decode("shift_jis", "replace")

    def by_name(self, needle: str):
        n = needle.lower()
        return [e for e in self.entries if n in e.name.lower()]

    def read_entry(self, entry: Entry) -> bytes:
        if self.data is None:
            raise RuntimeError("no BDF4 given to read from")
        if hasattr(self.data, "seek"):
            self.data.seek(self.base + entry.data_offset)
            raw = self.data.read(entry.compressed_size)
        else:
            start = self.base + entry.data_offset
            raw = self.data[start:start + entry.compressed_size]
        if entry.flags & 0x01:                # BXF-level DCX wrapper
            raw = dcx.decompress(raw)
        return raw
