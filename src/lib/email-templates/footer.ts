// Shared navy footer of every library email (company, contacts, offices | social links).
// One fixed layout at every width: two columns, text never wraps, and as the screen narrows the font sizes and
// icons shrink in steps (FOOTER_CSS). Icons keep explicit pixel sizes (a percentage max-width inside an auto-width
// table cell collapses the image to 0, which made the contact icons vanish). A client that drops <style>
// (e.g. a paste into Gmail compose) keeps the desktop sizes, which fit the 660px card.

export const FOOTER_START = '<!--FOOTER-V16-->';
export const FOOTER_END = '<!--/FOOTER-V16-->';
const CSS_MARK = '/*FOOTER-V16*/';

export const FOOTER_CSS = `${CSS_MARK}
  @media only screen and (max-width:620px) {
    .ft-head { font-size:10px !important; letter-spacing:0.2px !important; }
    .ft-hr { font-size:9px !important; }
    .ft-txt { font-size:9px !important; line-height:13px !important; }
    .ft-sm { font-size:7.5px !important; }
    .ft-ico { width:11px !important; height:11px !important; }
    .ft-soc { width:20px !important; height:auto !important; }
  }
  @media only screen and (max-width:520px) {
    .ft-head { font-size:9px !important; white-space:normal !important; }
    .ft-r { width:170px !important; }
    .ft-hr { font-size:8px !important; }
    .ft-txt { font-size:8px !important; line-height:12px !important; white-space:normal !important; }
    .ft-sm { font-size:6.5px !important; }
    .ft-ico { width:9px !important; height:9px !important; }
    .ft-soc { width:16px !important; }
  }
  @media only screen and (max-width:440px) {
    .ft-head { font-size:7.5px !important; letter-spacing:0 !important; white-space:normal !important; }
    .ft-r { width:132px !important; padding-left:8px !important; }
    .ft-hr { font-size:6.5px !important; letter-spacing:0 !important; }
    .ft-txt { font-size:7.5px !important; line-height:11px !important; white-space:normal !important; }
    .ft-sm { font-size:5.5px !important; }
    .ft-ico { width:8px !important; height:8px !important; }
    .ft-soc { width:16px !important; }
  }`;

const FONT = 'font-family:Arial,Helvetica,sans-serif;';
const WHITE = '#FFFFFF';
const ORANGE = '#FE9B03';
const nb = (s: string) => s.replace(/ /g, '&nbsp;');
const mapUrl = (query: string) => `https://www.google.com/maps/search/?api=1&amp;query=${query}`;

function contact(icon: string, w: number, h: number, alt: string, inner: string) {
  return `<tr>
            <td width="13" valign="middle" style="width:13px;padding:3px 6px 3px 0;"><img class="ft-ico" src="/email/${icon}.png" width="${w}" height="${h}" alt="${alt}" style="display:block;width:${w}px;height:${h}px;border:0;"></td>
            <td class="ft-txt" valign="middle" style="${FONT}font-size:10px;line-height:14px;color:${WHITE};padding:3px 0;white-space:nowrap;">${inner}</td>
          </tr>`;
}

function office(label: string, address: string, query: string) {
  const href = mapUrl(query);
  return `<tr><td class="ft-txt" style="${FONT}font-size:10px;line-height:14px;color:${WHITE};padding:3px 14px 3px 0;white-space:normal;"><a href="${href}" target="_blank" style="color:${ORANGE};font-weight:bold;text-decoration:none;">${label}:</a> <a href="${href}" target="_blank" style="color:${WHITE};text-decoration:none;">${address}</a></td></tr>`;
}

const SOCIALS: [string, string, string][] = [
  ['Facebook', 'facebook', 'https://www.facebook.com/duhoccatholicmta'],
  ['YouTube', 'youtube', 'https://www.youtube.com/@duhoccatholicmta'],
  ['Instagram', 'instagram', 'https://www.instagram.com/duhoc_catholicmta'],
  ['TikTok', 'tiktok', 'https://www.tiktok.com/@catholicmta'],
  ['X', 'x', 'https://x.com/DHCATHOLICMTA'],
  ['Threads', 'threads', 'https://www.threads.com/@duhoc_catholicmta'],
];

const socialCells = SOCIALS.map(
  ([name, file, url], i) =>
    `<td style="padding-right:${i === SOCIALS.length - 1 ? 0 : 4}px;"><a href="${url}" target="_blank" rel="noopener" title="${name}" style="text-decoration:none;"><img class="ft-soc" src="/email/ft-${file}.png" width="24" height="25" alt="${name}" style="display:block;width:24px;height:25px;border:0;font-family:Arial,Helvetica,sans-serif;font-size:7px;color:${WHITE};"></a></td>`
).join('');

// Bottom blue/orange colour bar, part of the footer block.
const FOOTER_STRIP = `<!--FOOTER-STRIP--><tr><td>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
    <td width="50%" height="12" bgcolor="#055BB2" style="background-color:#055BB2;height:12px;font-size:0;line-height:0;">&nbsp;</td>
    <td width="50%" height="12" bgcolor="#FE8F04" style="background-color:#FE8F04;height:12px;font-size:0;line-height:0;">&nbsp;</td>
  </tr></table>
</td></tr>`;

export const EMAIL_FOOTER = `${FOOTER_START}
<tr><td bgcolor="#002B66" style="background-color:#002B66;padding:16px 12px 13px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;"><tr>
    <td valign="top" style="padding-right:12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td class="ft-head" style="${FONT}font-size:11.5px;line-height:15px;font-weight:bold;color:${WHITE};letter-spacing:0.4px;padding:0 0 9px 1px;white-space:nowrap;">CÔNG TY TNHH TƯ VẤN DU HỌC CATHOLIC MTA</td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="top" style="padding-right:8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          ${contact('ft-phone', 13, 13, 'Điện thoại', `<a href="tel:+84909451822" style="color:${WHITE};text-decoration:none;">${nb('0909 451 822')}</a> – <a href="tel:+84902968652" style="color:${WHITE};text-decoration:none;">${nb('0902 968 652')}</a>`)}
          ${contact('ft-mail', 13, 11, 'Email', `<a href="mailto:info@mtacorporation.com" style="color:${WHITE};text-decoration:underline;">info@mtacorporation.com</a>`)}
          ${contact('ft-web', 13, 13, 'Website', `<a href="https://catholicmta.edu.vn" target="_blank" style="color:${WHITE};text-decoration:underline;">catholicmta.edu.vn</a>`)}
              </table>
            </td>
            <td valign="top" width="100%">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          ${office('Việt Nam', '45 Đinh Tiên Hoàng, Phường Sài Gòn, TP.HCM', '45+%C4%90inh+Ti%C3%AAn+Ho%C3%A0ng%2C+Ph%C6%B0%E1%BB%9Dng+S%C3%A0i+G%C3%B2n%2C+TP.HCM')}
          ${office('Hoa Kỳ', '8107 Bolsa Ave, Midway City, CA 92655', '8107+Bolsa+Ave%2C+Midway+City%2C+CA+92655')}
          ${office('Canada', '110 James St. Suite 200, St. Catharines, ON L2R 7E8, CA', '110+James+St.+Suite+200%2C+St.+Catharines%2C+ON+L2R+7E8%2C+CA')}
              </table>
            </td>
          </tr></table>
        </td></tr>
      </table>
    </td>
    <td class="ft-r" valign="top" width="218" align="center" style="width:218px;border-left:1px solid #3A5A8C;padding-left:12px;text-align:center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" class="ft-hr" style="${FONT}font-size:9.5px;line-height:15px;font-weight:bold;color:${WHITE};letter-spacing:0.2px;padding-bottom:9px;text-align:center;white-space:nowrap;">HÃY KẾT NỐI CÙNG CHÚNG TÔI</td></tr>
        <tr><td align="center"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>${socialCells}</tr></table></td></tr>
        <tr><td align="center" class="ft-sm" style="${FONT}font-size:8px;line-height:12px;color:${WHITE};padding-top:7px;white-space:nowrap;text-align:center;">${SOCIALS.map(([n]) => n).join(' · ')}</td></tr>
      </table>
    </td>
  </tr></table>
</td></tr>
${FOOTER_STRIP}
${FOOTER_END}`;

const OLD_BLOCK = /<!--FOOTER-V\d+-->[\s\S]*?<!--\/FOOTER-V\d+-->/;
const OLD_CSS = /\/\*FOOTER-V\d+\*\/[\s\S]*?\n {2}\}(?=\s*<\/style>)/;

// Swaps whichever older footer a template carries (compact one-row letters, the multi-row FOOTER comment layout,
// or an earlier V3 block) up to and including the bottom colour strip for EMAIL_FOOTER, widens the card to
// 660px, and adds FOOTER_CSS. Unrecognised layouts come back unchanged, so a heavily hand-edited copy is never damaged.
export function upgradeFooter(html: string): { html: string; changed: boolean } {
  if (html.includes(FOOTER_START)) {
    // Copies saved before the colour bar was part of the block get it back.
    if (html.includes('<!--FOOTER-STRIP-->')) return { html, changed: false };
    return { html: html.replace(FOOTER_END, () => `${FOOTER_STRIP}
${FOOTER_END}`), changed: true };
  }
  if (OLD_BLOCK.test(html)) {
    let out = html.replace(OLD_BLOCK, () => EMAIL_FOOTER);
    out = OLD_CSS.test(out) ? out.replace(OLD_CSS, () => FOOTER_CSS) : out.replace('</head>', `<style>\n  ${FOOTER_CSS}\n</style>\n</head>`);
    return { html: out, changed: true };
  }
  const strip = /<tr>\s*<td>\s*<table[^>]*>\s*(?:<tbody>\s*)?<tr>\s*<td width="(?:45|50)%"/g;
  let stripAt = -1;
  for (const m of html.matchAll(strip)) stripAt = m.index!; // the last strip is the bottom one
  if (stripAt < 0) return { html, changed: false };
  const stripClose = /<\/table>\s*<\/td>\s*<\/tr>/g;
  stripClose.lastIndex = stripAt;
  const close = stripClose.exec(html);
  if (!close) return { html, changed: false };
  const end = close.index + close[0].length;

  const head = html.slice(0, stripAt);
  const comment = head.lastIndexOf('<!-- FOOTER');
  const bare = head.search(/<tr>\s*<td bgcolor="#0f2f6b"[^>]*>(?:(?!<tr>)[\s\S])*?CÔNG TY TNHH/);
  const start = [comment, bare].find((i) => i >= 0);
  if (start === undefined) return { html, changed: false };

  let out = `${html.slice(0, start)}${EMAIL_FOOTER}${html.slice(end)}`;
  out = out.replace('width="600"', 'width="660"').replace('max-width:600px', 'max-width:660px');
  out = out.replace('</head>', `<style>\n  ${FOOTER_CSS}\n</style>\n</head>`);
  return { html: out, changed: true };
}
