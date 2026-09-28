#!/usr/bin/env node
/**
 * Task 136 §1 — generate a self-signed HTTPS cert for the LAN.
 *
 * Phones only grant camera access (getUserMedia) in a *secure context*, and a
 * `http://192.168.x.x:5173` tab is not one. So the live scanner needs the dev
 * server on HTTPS. This script writes `.cert/key.pem` + `.cert/cert.pem`
 * (gitignored) for `localhost` and every LAN IPv4 the machine currently has.
 *
 * It uses the `openssl` binary when one is on PATH (Git for Windows ships it);
 * otherwise it builds the same certificate with Node's `crypto` only — no new
 * npm dependency. Re-run it after switching networks so the new IP is covered.
 *
 *   npm run cert              # openssl if present, else Node
 *   npm run cert -- --node    # force the dependency-free Node path
 *   npm run cert -- --force   # overwrite an existing .cert/
 */
import { execFileSync, spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const args = new Set(process.argv.slice(2))
const force = args.has('--force') || args.has('-f')
const forceNode = args.has('--node')
const dirArg = process.argv.find((a) => a.startsWith('--dir='))
const outDir = path.resolve(dirArg ? dirArg.slice('--dir='.length) : process.cwd(), dirArg ? '.' : '.cert')
const keyPath = path.join(outDir, 'key.pem')
const certPath = path.join(outDir, 'cert.pem')

function lanIPv4() {
  const ips = new Set()
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.internal) continue
      const family = typeof net.family === 'string' ? net.family : net.family === 4 ? 'IPv4' : ''
      if (family !== 'IPv4') continue
      ips.add(net.address)
    }
  }
  return [...ips]
}

function sanEntries() {
  const host = os.hostname()
  const dns = ['localhost']
  if (host && /^[a-z0-9.-]+$/i.test(host) && host.toLowerCase() !== 'localhost') dns.push(host)
  const ips = ['127.0.0.1', ...lanIPv4()]
  return { dns, ips }
}

function opensslAvailable() {
  try {
    return spawnSync('openssl', ['version'], { stdio: 'ignore' }).status === 0
  } catch {
    return false
  }
}

function writeWithOpenssl(dns, ips) {
  const san = [...dns.map((d) => `DNS:${d}`), ...ips.map((ip) => `IP:${ip}`)].join(',')
  execFileSync(
    'openssl',
    [
      'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-sha256',
      '-keyout', keyPath, '-out', certPath, '-days', '825',
      '-subj', '/CN=all-knowing-dev',
      '-addext', `subjectAltName=${san}`,
      '-addext', 'basicConstraints=critical,CA:TRUE',
      '-addext', 'keyUsage=critical,digitalSignature,keyEncipherment,keyCertSign',
    ],
    { stdio: 'inherit' },
  )
}

// --- Minimal ASN.1 DER encoder for the dependency-free fallback ---------------

const der = {
  bool(v) {
    return Buffer.from([0x01, 0x01, v ? 0xff : 0x00])
  },
  int(bytes) {
    let b = Buffer.isBuffer(bytes) ? bytes : Buffer.from([bytes])
    if (b[0] & 0x80) b = Buffer.concat([Buffer.from([0x00]), b])
    return tlv(0x02, b)
  },
  intNum(n) {
    if (n === 0) return tlv(0x02, Buffer.from([0x00]))
    const bytes = []
    let x = n
    while (x > 0) {
      bytes.unshift(x & 0xff)
      x = Math.floor(x / 256)
    }
    return der.int(Buffer.from(bytes))
  },
  oid(str) {
    const parts = str.split('.').map((p) => Number(p))
    const out = [40 * parts[0] + parts[1]]
    for (let i = 2; i < parts.length; i++) {
      let v = parts[i]
      const stack = [v & 0x7f]
      v = Math.floor(v / 128)
      while (v > 0) {
        stack.unshift((v & 0x7f) | 0x80)
        v = Math.floor(v / 128)
      }
      out.push(...stack)
    }
    return tlv(0x06, Buffer.from(out))
  },
  null: () => tlv(0x05, Buffer.alloc(0)),
  utf8: (s) => tlv(0x0c, Buffer.from(s, 'utf8')),
  ia5: (s) => tlv(0x16, Buffer.from(s, 'ascii')),
  octet: (buf) => tlv(0x04, buf),
  bitString(buf, unused = 0) {
    return tlv(0x03, Buffer.concat([Buffer.from([unused]), buf]))
  },
  utc(date) {
    const p = (n, w = 2) => String(n).padStart(w, '0')
    const s = `${p(date.getUTCFullYear() % 100)}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}Z`
    return tlv(0x17, Buffer.from(s, 'ascii'))
  },
  seq(...vals) {
    return tlv(0x30, Buffer.concat(vals))
  },
  set(...vals) {
    return tlv(0x31, Buffer.concat(vals))
  },
  ctxExplicit(tag, value) {
    return tlv(0xa0 | tag, value)
  },
  ctxPrimitive(tag, value) {
    return tlv(0x80 | tag, value)
  },
}

function tlv(tag, value) {
  const len = encodeLength(value.length)
  return Buffer.concat([Buffer.from([tag]), len, value])
}

function encodeLength(n) {
  if (n < 0x80) return Buffer.from([n])
  const bytes = []
  let x = n
  while (x > 0) {
    bytes.unshift(x & 0xff)
    x >>= 8
  }
  return Buffer.from([0x80 | bytes.length, ...bytes])
}

function ipToBytes(ip) {
  if (ip.includes(':')) {
    // IPv6 — expand to 16 bytes.
    const [head, tail = ''] = ip.split('::')
    const h = head ? head.split(':') : []
    const t = tail ? tail.split(':') : []
    const missing = 8 - h.length - t.length
    const groups = [...h, ...Array(Math.max(0, missing)).fill('0'), ...t].map((g) => parseInt(g || '0', 16))
    return Buffer.from(groups.flatMap((g) => [(g >> 8) & 0xff, g & 0xff]))
  }
  return Buffer.from(ip.split('.').map((p) => Number(p)))
}

function writeWithNode(dns, ips) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
  const jwk = publicKey.export({ format: 'jwk' })
  const mod = Buffer.from(jwk.n, 'base64url')
  const exp = Buffer.from(jwk.e, 'base64url')

  const sha256Rsa = der.seq(der.oid('1.2.840.113549.1.1.11'), der.null())
  const rsaAlg = der.seq(der.oid('1.2.840.113549.1.1.1'), der.null())
  const rsaKey = der.seq(der.int(mod), der.int(exp))
  const spki = der.seq(rsaAlg, der.bitString(rsaKey))
  const name = der.seq(der.set(der.seq(der.oid('2.5.4.3'), der.utf8('all-knowing-dev'))))

  const now = new Date()
  const notBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const notAfter = new Date(now.getTime() + 825 * 24 * 60 * 60 * 1000)
  const validity = der.seq(der.utc(notBefore), der.utc(notAfter))

  const san = der.seq(
    ...dns.map((d) => der.ctxPrimitive(2, der.ia5(d))),
    ...ips.map((ip) => der.ctxPrimitive(7, ipToBytes(ip))),
  )
  const extensions = der.seq(
    der.seq(der.oid('2.5.29.19'), der.bool(true), der.octet(der.seq(der.bool(true)))),
    der.seq(der.oid('2.5.29.15'), der.bool(true), der.octet(der.bitString(Buffer.from([0xa0])))),
    der.seq(der.oid('2.5.29.17'), der.octet(san)),
  )

  const serial = crypto.randomBytes(8)
  serial[0] &= 0x7f
  const tbs = der.seq(
    der.ctxExplicit(0, der.intNum(2)),
    der.int(serial),
    sha256Rsa,
    name,
    validity,
    name,
    spki,
    der.ctxExplicit(3, extensions),
  )
  const signature = crypto.sign('sha256', tbs, privateKey)
  if (!crypto.verify('sha256', tbs, publicKey, signature)) {
    throw new Error('self-check failed: the generated certificate signature does not verify')
  }
  const cert = der.seq(tbs, sha256Rsa, der.bitString(signature))

  fs.writeFileSync(keyPath, privateKey.export({ type: 'pkcs8', format: 'pem' }))
  fs.writeFileSync(certPath, derToPem(cert, 'CERTIFICATE'))
}

function derToPem(buf, label) {
  const b64 = buf.toString('base64').replace(/(.{64})/g, '$1\n').trimEnd()
  return `-----BEGIN ${label}-----\n${b64}\n-----END ${label}-----\n`
}

// --- main --------------------------------------------------------------------

function main() {
  if (fs.existsSync(certPath) && !force) {
    console.log(`[cert] ${certPath} already exists — leaving it (use --force to regenerate).`)
    return
  }
  fs.mkdirSync(outDir, { recursive: true })
  const { dns, ips } = sanEntries()
  const useOpenssl = !forceNode && opensslAvailable()
  if (useOpenssl) {
    console.log('[cert] using openssl')
    writeWithOpenssl(dns, ips)
  } else {
    console.log(forceNode ? '[cert] using Node crypto (--node)' : '[cert] openssl not found — using Node crypto')
    writeWithNode(dns, ips)
  }
  // Validate what we just wrote (Node parses the DER even for the openssl path).
  const parsed = new crypto.X509Certificate(fs.readFileSync(certPath))
  console.log(`[cert] wrote ${path.relative(process.cwd(), keyPath)} + ${path.relative(process.cwd(), certPath)}`)
  console.log(`[cert] subject: ${parsed.subject.replace(/\n/g, ', ')}`)
  console.log(`[cert] valid:   ${parsed.validFrom} → ${parsed.validTo}`)
  console.log(`[cert] covers:  ${[...dns.map((d) => `DNS:${d}`), ...ips.map((ip) => `IP:${ip}`)].join(', ')}`)
  console.log('')
  console.log('Next steps:')
  console.log('  1. Restart the dev server (`npm run dev`); Vite now serves https://localhost:5173.')
  console.log('  2. On the phone open https://<this PC LAN IP>:5173 and accept the "not private" warning once')
  console.log('     (Advanced → Proceed). Camera access works after that.')
  console.log('  3. Re-run `npm run cert -- --force` whenever the LAN IP changes.')
}

main()
