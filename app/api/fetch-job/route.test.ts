import { describe, expect, it } from "vitest";
import { extractText, isSafeUrl } from "./route";

describe("isSafeUrl", () => {
  it("allows a normal public https URL", () => {
    expect(isSafeUrl("https://www.linkedin.com/jobs/view/123")).toBe(true);
  });

  it("allows a normal public http URL", () => {
    expect(isSafeUrl("http://example.com/job")).toBe(true);
  });

  it("allows a public IP that merely looks similar to a private range", () => {
    expect(isSafeUrl("https://172.15.0.1/")).toBe(true);
    expect(isSafeUrl("https://172.32.0.1/")).toBe(true);
  });

  it("rejects unparseable URLs", () => {
    expect(isSafeUrl("not a url")).toBe(false);
  });

  it("rejects non-http(s) protocols", () => {
    expect(isSafeUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeUrl("ftp://example.com/file")).toBe(false);
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects loopback and localhost", () => {
    expect(isSafeUrl("http://localhost/")).toBe(false);
    expect(isSafeUrl("http://127.0.0.1/")).toBe(false);
    expect(isSafeUrl("http://127.5.5.5/")).toBe(false);
    expect(isSafeUrl("http://[::1]/")).toBe(false);
  });

  it("rejects IPv6 ULA, link-local, and IPv4-mapped addresses", () => {
    // URL#hostname wraps IPv6 literals in brackets (e.g. "[::1]") — these
    // exercise that every IPv6 pattern accounts for the brackets.
    expect(isSafeUrl("http://[fd12:3456:789a::1]/")).toBe(false);
    expect(isSafeUrl("http://[fe80::1]/")).toBe(false);
    // ::ffff:127.0.0.1 is a classic SSRF bypass for loopback filters.
    expect(isSafeUrl("http://[::ffff:127.0.0.1]/")).toBe(false);
  });

  it("rejects private/internal IPv4 ranges (SSRF guard)", () => {
    expect(isSafeUrl("http://10.0.0.1/")).toBe(false);
    expect(isSafeUrl("http://192.168.1.1/")).toBe(false);
    expect(isSafeUrl("http://172.16.0.1/")).toBe(false);
    expect(isSafeUrl("http://172.31.255.255/")).toBe(false);
    expect(isSafeUrl("http://0.0.0.0/")).toBe(false);
    expect(isSafeUrl("http://169.254.169.254/")).toBe(false);
  });

  it("rejects mDNS/.local and the cloud metadata hostname", () => {
    expect(isSafeUrl("http://my-box.local/")).toBe(false);
    expect(isSafeUrl("http://metadata.google.internal/")).toBe(false);
  });
});

describe("extractText", () => {
  it("strips tags but keeps text content", () => {
    expect(extractText("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("removes script and style blocks including their content", () => {
    const html =
      "<div>Keep me<script>alert('drop me')</script><style>.x{color:red}</style>End</div>";
    expect(extractText(html)).toBe("Keep meEnd");
  });

  it("decodes common HTML entities", () => {
    expect(
      extractText("Tom &amp; Jerry &lt;3&gt; &quot;fun&quot; &#39;s&#39;")
    ).toBe("Tom & Jerry <3> \"fun\" 's'");
  });

  it("treats &nbsp; as a space", () => {
    expect(extractText("a&nbsp;&nbsp;b")).toBe("a b");
  });

  it("collapses whitespace and trims", () => {
    expect(extractText("  <div>\n\n  Hello   \n  World  </div>  ")).toBe(
      "Hello World"
    );
  });

  it("returns an empty string for markup with no visible text", () => {
    expect(extractText("<script>x()</script><style>.a{}</style>")).toBe("");
  });
});
