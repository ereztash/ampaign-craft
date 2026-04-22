// SSRF guard for outbound fetches to user-controlled URLs.
//
// Validates that a URL is a publicly-routable HTTPS destination. Rejects:
//  - non-https schemes (http, file, gopher, etc.)
//  - literal private/loopback/link-local IPs in the hostname
//  - hostnames whose DNS resolves to any private/loopback/link-local IP
//    (defeats DNS rebinding when paired with a pre-fetch check)

const PRIVATE_V4_CIDRS: Array<[number, number]> = [
  // [network, mask bits]
  [ipv4ToInt("10.0.0.0"), 8],
  [ipv4ToInt("127.0.0.0"), 8],
  [ipv4ToInt("169.254.0.0"), 16],
  [ipv4ToInt("172.16.0.0"), 12],
  [ipv4ToInt("192.168.0.0"), 16],
  [ipv4ToInt("100.64.0.0"), 10], // carrier-grade NAT
  [ipv4ToInt("0.0.0.0"), 8],
];

function ipv4ToInt(ip: string): number {
  const [a, b, c, d] = ip.split(".").map((p) => parseInt(p, 10));
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return false;
  const n = ipv4ToInt(ip);
  return PRIVATE_V4_CIDRS.some(([net, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (net & mask);
  });
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA fc00::/7
  // IPv4-mapped IPv6: ::ffff:a.b.c.d
  const mapped = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped && isPrivateIPv4(mapped[1])) return true;
  return false;
}

export interface UrlGuardResult {
  allowed: boolean;
  reason?: string;
}

export async function assertPublicHttpsUrl(urlStr: string): Promise<UrlGuardResult> {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    return { allowed: false, reason: "invalid_url" };
  }

  if (url.protocol !== "https:") {
    return { allowed: false, reason: "non_https_scheme" };
  }

  const host = url.hostname;
  if (!host) return { allowed: false, reason: "empty_host" };

  // Literal IP in the URL — reject without DNS lookup.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return isPrivateIPv4(host) ? { allowed: false, reason: "private_ipv4" } : { allowed: true };
  }
  if (host.includes(":") || host.startsWith("[")) {
    const stripped = host.replace(/^\[|\]$/g, "");
    return isPrivateIPv6(stripped) ? { allowed: false, reason: "private_ipv6" } : { allowed: true };
  }

  // Hostname — resolve and verify every returned address is public.
  try {
    const a = await Deno.resolveDns(host, "A").catch(() => [] as string[]);
    const aaaa = await Deno.resolveDns(host, "AAAA").catch(() => [] as string[]);
    const addresses = [...a, ...aaaa];
    if (addresses.length === 0) return { allowed: false, reason: "dns_no_result" };
    for (const addr of addresses) {
      if (isPrivateIPv4(addr) || isPrivateIPv6(addr)) {
        return { allowed: false, reason: `resolves_to_private:${addr}` };
      }
    }
    return { allowed: true };
  } catch (err) {
    return { allowed: false, reason: `dns_error:${String(err)}` };
  }
}
