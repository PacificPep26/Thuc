// Shared signature for every library email. Keep this table-based and inline-styled because the HTML is copied
// into email clients, where external CSS and flex/grid layouts are not reliable.
export const SIGNATURE_START = '<!--SIGNATURE-V1-->';
export const SIGNATURE_END = '<!--/SIGNATURE-V1-->';

export const EMAIL_SIGNATURE = `${SIGNATURE_START}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#333333;margin-top:2px;">
  <tr>
    <td valign="middle" width="140" style="padding:4px 18px 4px 0;">
      <img src="/email/emblem.png" alt="Catholic MTA" width="130" style="display:block;border:0;outline:none;text-decoration:none;width:130px;max-width:100%;height:auto;">
    </td>
    <td valign="middle" style="border-left:2px solid #f39422;padding:4px 0 4px 18px;white-space:nowrap;">
      <div style="font-size:17px;line-height:22px;font-weight:bold;color:#1b4f9c;white-space:nowrap;">Hồ Thị Đoan Thục</div>
      <div style="font-size:13px;line-height:20px;font-weight:bold;color:#f39422;padding-bottom:7px;white-space:nowrap;">Bộ phận xử lý hồ sơ</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;line-height:20px;color:#333333;">
        <tr><td valign="middle" width="25" style="padding:0 9px 6px 0;"><img src="/email/ico-phone.png" alt="Điện thoại" width="16" height="16" style="display:block;border:0;width:16px;height:16px;"></td><td valign="middle" style="padding-bottom:6px;white-space:nowrap;"><a href="tel:+84909721055" style="color:#333333;text-decoration:none;">(+84) 909 721 055</a></td></tr>
        <tr><td valign="middle" width="25" style="padding:0 9px 6px 0;"><img src="/email/ico-mail.png" alt="Email" width="16" height="16" style="display:block;border:0;width:16px;height:16px;"></td><td valign="middle" style="padding-bottom:6px;white-space:nowrap;"><a href="mailto:admin@mtacorporation.com" style="color:#333333;text-decoration:none;">admin@mtacorporation.com</a></td></tr>
        <tr><td valign="middle" width="25" style="padding:0 9px 0 0;"><img src="/email/ico-web.png" alt="Website" width="16" height="16" style="display:block;border:0;width:16px;height:16px;"></td><td valign="middle" style="white-space:nowrap;"><a href="https://catholicmta.edu.vn/" target="_blank" style="color:#1b4f9c;text-decoration:none;">catholicmta.edu.vn</a></td></tr>
      </table>
    </td>
  </tr>
</table>
${SIGNATURE_END}`;

function tableEnd(html: string, start: number) {
  const tags = /<\/?table\b[^>]*>/gi;
  tags.lastIndex = start;
  let depth = 0;
  for (let match = tags.exec(html); match; match = tags.exec(html)) {
    depth += /^<table\b/i.test(match[0]) ? 1 : -1;
    if (depth === 0) return tags.lastIndex;
  }
  return -1;
}

export function upgradeSignature(html: string): { html: string; changed: boolean } {
  if (html.includes(SIGNATURE_START)) return { html, changed: false };

  const closing = html.search(/Trân trọng,?/i);
  if (closing < 0) return { html, changed: false };
  const start = html.indexOf('<table', closing);
  if (start < 0) return { html, changed: false };
  const end = tableEnd(html, start);
  if (end < 0 || !html.slice(start, end).includes('/email/emblem.png')) return { html, changed: false };

  return { html: `${html.slice(0, start)}${EMAIL_SIGNATURE}${html.slice(end)}`, changed: true };
}
