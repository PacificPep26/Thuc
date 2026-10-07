import { STAGE_LIBRARY_KEY } from '@/lib/email-templates/stage-library';
// Preset email templates for student progress notifications.
// Body syntax (see render.ts): **bold**, lines starting with "- " are bullets,
// lines starting with "☐ " are checklist items, blank line = new paragraph.
// The "auto email, do not reply" line is appended by the renderer, not stored here.

export interface EmailPreset {
  key: string;
  title: string;
  subject: string;
  body: string;
}

// One subject for every stage, as in the company's original progress-update template.
const SUBJECT = 'CẬP NHẬT HỒ SƠ – {{tenHocSinhHoa}} – {{ngayGui}}.';

const SIGNATURE =
  'Trân trọng,\n**Hồ Thị Đoan Thục**\nBộ phận xử lý hồ sơ\n(+84) 382 395 146\nadmin@mtacorporation.com';
const CLOSING = 'Kính chúc Quý khách nhiều sức khỏe, may mắn và thành công!';
const GREETING = 'Kính gửi Quý phụ huynh {{tenPhuHuynh}} và em {{tenHocSinh}},';

function body(...parts: string[]) {
  return [GREETING, ...parts, CLOSING, SIGNATURE].join('\n\n');
}

export const EMAIL_PRESETS: EmailPreset[] = [
  {
    key: 'gd1_hop_dong',
    title: 'GĐ1 – Cảm ơn & ký hợp đồng, thu thập giấy tờ',
    subject: SUBJECT,
    body: [
      'Kính gửi Quý phụ huynh **{{tenPhuHuynh}}** và em **{{tenHocSinh}}**,',
      'Lời nói đầu tiên, **Công ty TNHH Tư Vấn Du học Catholic MTA** xin gửi lời cảm ơn chân thành và sâu sắc nhất đến Quý khách vì đã tin tưởng, lựa chọn và sử dụng dịch vụ **hồ sơ du học {{quocGia}}** của chúng tôi.',
      'Sự hài lòng và niềm tin của Quý khách chính là động lực to lớn để giúp Catholic MTA không ngừng nâng cao chất lượng dịch vụ, mang lại những trải nghiệm tốt nhất và giá trị thiết thực hơn nữa trên hành trình du học của em **{{tenHocSinh}}**.',
      'Qua thư này, chúng tôi xin thông báo rằng hiện tại hồ sơ của Quý khách **đã được chuyển tiếp sang Bộ phận xử lý hồ sơ** của Công ty chúng tôi, để tiếp tục tiến hành xử lý các bước tiếp theo.',
      '[[HO_SO]]',
      'Xin lưu ý rằng Bộ phận xử lý hồ sơ của chúng tôi **sẽ sớm liên hệ đến Quý khách** để hướng dẫn các bước thủ tục tiếp theo. Trong thời gian chờ đợi, nếu Quý khách có bất kỳ góp ý nào hoặc cần hỗ trợ, xin vui lòng liên hệ với chúng tôi qua:',
      '[[LIEN_HE]]',
      'Chúng tôi rất vui khi được đồng hành cùng với Quý khách trong suốt hành trình du học của em **{{tenGoi}}**.',
      CLOSING,
      SIGNATURE,
    ].join('\n\n'),
  },
  {
    key: 'gd2_nop_ho_so',
    title: 'GĐ2 – Nộp hồ sơ vào trường xin I-20',
    subject: SUBJECT,
    body: body(
      'Catholic MTA xin trân trọng cập nhật tiến độ hồ sơ du học của em {{tenHocSinh}}.',
      '**Tình trạng hiện tại:** Hồ sơ đã được nộp vào {{truong}} ngày {{ngayNopHoSo}} để xin cấp I-20 và đang chờ nhà trường xét duyệt.',
      '**Đang chờ:** Kết quả xét tuyển và I-20 từ nhà trường.',
      '**Gia đình cần thực hiện:** Hiện tại chưa cần. Nếu trường yêu cầu bổ sung giấy tờ, chúng tôi sẽ thông báo ngay cho Quý gia đình.',
      '**Bước tiếp theo:** Sau khi nhận được I-20, chúng tôi sẽ hướng dẫn gia đình các bước xin visa.',
      '**Cập nhật tiếp theo:** chậm nhất ngày {{ngayCapNhatTiepTheo}}, hoặc ngay khi có thông tin mới.'
    ),
  },
  {
    key: 'gd3_i20_visa',
    title: 'GĐ3 – Đã có I-20, làm hồ sơ visa',
    subject: SUBJECT,
    body: body(
      'Catholic MTA vui mừng thông báo em {{tenHocSinh}} đã được {{truong}} cấp I-20.',
      '**Tình trạng hiện tại:** I-20 được cấp ngày {{ngayCapI20}}. Chúng tôi đang thực hiện các bước xin visa: đóng phí SEVIS, điền đơn DS-160, đóng phí xét visa và đăng ký lịch phỏng vấn. Dự kiến hoàn tất trong vòng 1 tuần kể từ ngày I-20 được cấp.',
      '**Đang chờ:** Lịch phỏng vấn từ Lãnh sự quán/Đại sứ quán {{quocGia}}.',
      '**Gia đình cần thực hiện:**\n- Kiểm tra thông tin trên I-20 (họ tên, ngày sinh, ngành học) và báo ngay cho chuyên viên nếu có sai sót.\n- Học sinh ký tên vào I-20 theo hướng dẫn của chuyên viên.\n- Chuyên viên sẽ liên hệ nếu cần bổ sung thông tin cho đơn DS-160.',
      '**Bước tiếp theo:** Khi có lịch phỏng vấn chính thức, chúng tôi sẽ thông báo cho Quý gia đình.',
      '**Cập nhật tiếp theo:** chậm nhất ngày {{ngayCapNhatTiepTheo}}.'
    ),
  },
  {
    key: 'gd4_luyen_pv',
    title: 'GĐ4 – Lịch luyện phỏng vấn',
    subject: SUBJECT,
    body: body(
      'Để em {{tenHocSinh}} tự tin trong buổi phỏng vấn visa, Catholic MTA xin thông báo lịch luyện phỏng vấn:',
      '**Thời gian:** {{lichLuyenPhongVan}}\n**Hình thức/Địa điểm:** {{diaDiemLuyenPhongVan}}',
      '**Gia đình cần thực hiện:**\n- Học sinh tham gia đúng giờ, mang theo hộ chiếu, I-20 và bộ hồ sơ visa.\n- Ôn lại thông tin về trường, ngành học, kế hoạch học tập và tài chính gia đình.\n- Nếu không sắp xếp được thời gian, vui lòng liên hệ chuyên viên để đổi lịch.',
      '**Bước tiếp theo:** Tiếp tục chờ lịch phỏng vấn chính thức từ Lãnh sự quán. Chúng tôi sẽ thông báo ngay khi có lịch.'
    ),
  },
  {
    key: 'gd5_lich_pv',
    title: 'GĐ5 – Lịch phỏng vấn chính thức',
    subject: SUBJECT,
    body: body(
      'Catholic MTA xin thông báo em {{tenHocSinh}} đã có lịch phỏng vấn visa chính thức:',
      '**Ngày giờ:** {{lichPhongVan}}\n**Địa điểm:** {{diaDiemPhongVan}}',
      '**Gia đình cần thực hiện:**\n- Có mặt trước giờ hẹn ít nhất 30 phút.\n- Mang theo bản gốc: hộ chiếu, I-20, trang xác nhận DS-160, biên lai phí SEVIS, thư xác nhận lịch hẹn, hồ sơ học vấn và hồ sơ tài chính.\n- Thực hiện đúng quy định về vật dụng được mang vào khu vực phỏng vấn theo thư xác nhận lịch hẹn và hướng dẫn của chuyên viên.',
      '**Bước tiếp theo:** Chúng tôi sẽ gửi email nhắc lịch trước ngày phỏng vấn.'
    ),
  },
  {
    key: 'gd6_nhac_pv',
    title: 'GĐ6 – Nhắc lịch phỏng vấn',
    subject: SUBJECT,
    body: body(
      'Catholic MTA xin nhắc lịch phỏng vấn visa của em {{tenHocSinh}}:',
      '**Ngày giờ:** {{lichPhongVan}}\n**Địa điểm:** {{diaDiemPhongVan}}',
      '**Danh sách cần mang theo:**\n☐ Hộ chiếu\n☐ I-20 (có chữ ký của học sinh)\n☐ Trang xác nhận DS-160\n☐ Biên lai phí SEVIS\n☐ Thư xác nhận lịch hẹn\n☐ Hồ sơ học vấn và hồ sơ tài chính bản gốc',
      '**Lưu ý:** Đến sớm 30 phút, ăn mặc lịch sự, trả lời ngắn gọn, trung thực và tự tin.',
      'Chúc em {{tenHocSinh}} có buổi phỏng vấn thành công!'
    ),
  },
  {
    key: 'gd7a_dau_visa',
    title: 'GĐ7A – Chúc mừng đậu visa',
    subject: SUBJECT,
    body: body(
      'Catholic MTA vô cùng vui mừng chúc mừng em {{tenHocSinh}} đã được cấp visa du học! Đây là kết quả của sự nỗ lực từ học sinh và sự đồng hành của gia đình.',
      '**Bước tiếp theo:**\n- Hộ chiếu có visa sẽ được trả về theo hình thức gia đình đã đăng ký. Vui lòng kiểm tra kỹ thông tin trên visa khi nhận.\n- Chuyên viên sẽ liên hệ để hỗ trợ các bước chuẩn bị trước khi bay: vé máy bay, nhà ở, bảo hiểm và hướng dẫn nhập học tại {{truong}}.',
      'Một lần nữa, xin chúc mừng gia đình và chúc em {{tenHocSinh}} có hành trình du học thật thành công!'
    ),
  },
  {
    key: 'gd7b_rot_visa',
    title: 'GĐ7B – Chia buồn rớt visa',
    subject: SUBJECT,
    body: body(
      'Catholic MTA rất tiếc phải thông báo hồ sơ xin visa của em {{tenHocSinh}} lần này chưa được chấp thuận. Chúng tôi hiểu đây là tin không vui và xin chia sẻ cùng gia đình.',
      '**Bước tiếp theo:** Chuyên viên phụ trách sẽ liên hệ Quý gia đình trong thời gian sớm nhất để:\n- Cùng xem lại buổi phỏng vấn và trao đổi về kết quả.\n- Tư vấn hướng củng cố hồ sơ và thời điểm phù hợp nếu gia đình muốn nộp lại.\n- Trao đổi các phương án khác nếu gia đình mong muốn.',
      'Catholic MTA luôn đồng hành cùng gia đình ở chặng đường tiếp theo.'
    ),
  },
];

export function getPreset(key: string | undefined) {
  return EMAIL_PRESETS.find((p) => p.key === key);
}

// Variables staff fill in per student (stored on student.notifyInfo).
// `type` drives the input control in the send popup.
export const NOTIFY_FIELDS = [
  { key: 'tenPhuHuynh', label: 'Tên phụ huynh', type: 'text' },
  { key: 'ngayKyHopDong', label: 'Ngày ký hợp đồng', type: 'date' },
  { key: 'hanNopGiayTo', label: 'Hạn nộp giấy tờ', type: 'date' },
  { key: 'ngayNopHoSo', label: 'Ngày nộp hồ sơ', type: 'date' },
  { key: 'ngayCapI20', label: 'Ngày cấp I-20', type: 'date' },
  { key: 'ngayCapThuMoi', label: 'Ngày cấp thư mời (LOA / Offer)', type: 'date' },
  { key: 'ngayCapNhatTiepTheo', label: 'Ngày cập nhật tiếp theo', type: 'date' },
  { key: 'lichLuyenPhongVan', label: 'Lịch luyện phỏng vấn', type: 'datetime-local' },
  { key: 'diaDiemLuyenPhongVan', label: 'Địa điểm luyện phỏng vấn', type: 'text' },
  { key: 'lichPhongVan', label: 'Lịch phỏng vấn', type: 'datetime-local' },
  { key: 'diaDiemPhongVan', label: 'Địa điểm phỏng vấn', type: 'text' },
] as const;

export type NotifyFieldKey = (typeof NOTIFY_FIELDS)[number]['key'];
export type NotifyInfo = Partial<Record<NotifyFieldKey, string>>;

// Staff fields are remembered per browser so each staff member types them once.
// The sender's name/phone/email now live in the email signature, so no staff fields are asked for any more.
export const STAFF_FIELD_KEYS: NotifyFieldKey[] = [];

// ---- Country-specific versions --------------------------------------------------------------
// The stage templates (stored per stage) are written for the US process (I-20, SEVIS, DS-160).
// Canada and New Zealand use a different admission letter and visa process, so the presets
// below replace the US text for those students. Phases 4–6 (interview) are US-only.

export type CountryKey = 'USA' | 'Canada' | 'NewZealand' | 'Germany' | 'France';

// Student country comes as "NewZealand" from the DB and "New Zealand" from the API.
export function countryKey(country?: string | null): CountryKey | undefined {
  const k = country?.replace(/\s+/g, '');
  return k === 'USA' || k === 'Canada' || k === 'NewZealand' || k === 'Germany' || k === 'France' ? (k as CountryKey) : undefined;
}

const NEXT_UPDATE = '**Cập nhật tiếp theo:** chậm nhất ngày {{ngayCapNhatTiepTheo}}.';

const COUNTRY_VARIANTS: Record<string, Partial<Record<CountryKey, { subject: string; body: string }>>> = {
  gd2_nop_ho_so: {
    Canada: {
      subject: SUBJECT,
      body: body(
        'Catholic MTA xin trân trọng cập nhật tiến độ hồ sơ du học của em {{tenHocSinh}}.',
        '**Tình trạng hiện tại:** Hồ sơ đã được nộp vào {{truong}} ngày {{ngayNopHoSo}} để xin Thư mời nhập học (Letter of Acceptance – LOA) và đang chờ nhà trường xét duyệt.',
        '**Đang chờ:** Kết quả xét tuyển và LOA từ nhà trường.',
        '**Gia đình cần thực hiện:** Hiện tại chưa cần. Nếu trường yêu cầu bổ sung giấy tờ, chúng tôi sẽ thông báo ngay cho Quý gia đình.',
        '**Bước tiếp theo:** Sau khi nhận LOA, chúng tôi sẽ hướng dẫn gia đình chuẩn bị hồ sơ xin Giấy phép du học (Study Permit).',
        NEXT_UPDATE + ' Hoặc ngay khi có thông tin mới.'
      ),
    },
    NewZealand: {
      subject: SUBJECT,
      body: body(
        'Catholic MTA xin trân trọng cập nhật tiến độ hồ sơ du học của em {{tenHocSinh}}.',
        '**Tình trạng hiện tại:** Hồ sơ đã được nộp vào {{truong}} ngày {{ngayNopHoSo}} để xin Thư mời nhập học (Offer of Place) và đang chờ nhà trường xét duyệt.',
        '**Đang chờ:** Kết quả xét tuyển và Offer of Place từ nhà trường.',
        '**Gia đình cần thực hiện:** Hiện tại chưa cần. Nếu trường yêu cầu bổ sung giấy tờ, chúng tôi sẽ thông báo ngay cho Quý gia đình.',
        '**Bước tiếp theo:** Sau khi nhận Offer of Place, chúng tôi sẽ hướng dẫn gia đình chuẩn bị hồ sơ xin visa du học New Zealand.',
        NEXT_UPDATE + ' Hoặc ngay khi có thông tin mới.'
      ),
    },
    Germany: {
      subject: SUBJECT,
      body: body(
        'Catholic MTA xin trân trọng cập nhật tiến độ hồ sơ du học Đức của em {{tenHocSinh}}.',
        '**Tình trạng hiện tại:** Hồ sơ đã được nộp vào {{truong}} ngày {{ngayNopHoSo}} để xin Giấy báo nhập học (Zulassungsbescheid / Offer) và đang chờ nhà trường xét duyệt.',
        '**Đang chờ:** Kết quả xét tuyển và Giấy báo nhập học từ nhà trường.',
        '**Gia đình cần thực hiện:** Hiện tại chưa cần. Nếu trường yêu cầu bổ sung giấy tờ, chúng tôi sẽ thông báo ngay cho Quý gia đình.',
        '**Bước tiếp theo:** Sau khi nhận Giấy báo nhập học, chúng tôi sẽ hướng dẫn gia đình chuẩn bị hồ sơ xin visa du học Đức (mở tài khoản phong tỏa Sperrkonto, bảo hiểm y tế).',
        NEXT_UPDATE + ' Hoặc ngay khi có thông tin mới.'
      ),
    },
    France: {
      subject: SUBJECT,
      body: body(
        'Catholic MTA xin trân trọng cập nhật tiến độ hồ sơ du học Pháp của em {{tenHocSinh}}.',
        '**Tình trạng hiện tại:** Hồ sơ đã được nộp vào {{truong}} ngày {{ngayNopHoSo}} để xin Thư chấp thuận nhập học (Attestation d\'admission / Offer) và đang chờ xét duyệt.',
        '**Đang chờ:** Kết quả xét tuyển từ trường và quy trình phỏng vấn Etudes en France (Campus France).',
        '**Gia đình cần thực hiện:** Hiện tại chưa cần. Nếu trường hoặc Campus France yêu cầu bổ sung giấy tờ, chúng tôi sẽ thông báo ngay cho Quý gia đình.',
        '**Bước tiếp theo:** Sau khi hoàn tất quy trình Campus France và nhận thư mời, chúng tôi sẽ hướng dẫn gia đình nộp hồ sơ xin visa du học Pháp (France-Visas).',
        NEXT_UPDATE + ' Hoặc ngay khi có thông tin mới.'
      ),
    },
  },
  gd3_i20_visa: {
    Canada: {
      subject: SUBJECT,
      body: body(
        'Catholic MTA vui mừng thông báo em {{tenHocSinh}} đã nhận được Thư mời nhập học (LOA) từ {{truong}}.',
        '**Tình trạng hiện tại:** LOA được cấp ngày {{ngayCapThuMoi}}. Chúng tôi đang chuẩn bị hồ sơ xin Study Permit theo yêu cầu hiện hành của Bộ Di trú Canada (IRCC).',
        '**Đang chờ:** Lịch lấy sinh trắc học (vân tay, ảnh) và kết quả xét duyệt từ IRCC.',
        '**Gia đình cần thực hiện:**\n- Kiểm tra thông tin trên LOA (họ tên, ngày sinh, ngành học) và báo ngay cho chuyên viên nếu có sai sót.\n- Chuẩn bị và gửi bổ sung hồ sơ tài chính theo danh sách chuyên viên cung cấp.\n- Em {{tenHocSinh}} đi lấy sinh trắc học đúng lịch hẹn khi có thông báo.',
        '**Bước tiếp theo:** Khi có kết quả từ IRCC, chúng tôi sẽ thông báo ngay cho Quý gia đình.',
        NEXT_UPDATE
      ),
    },
    NewZealand: {
      subject: SUBJECT,
      body: body(
        'Catholic MTA vui mừng thông báo em {{tenHocSinh}} đã nhận được Thư mời nhập học (Offer of Place) từ {{truong}}.',
        '**Tình trạng hiện tại:** Offer of Place được cấp ngày {{ngayCapThuMoi}}. Chúng tôi đang chuẩn bị hồ sơ xin visa du học (Student Visa) để nộp trực tuyến cho Sở Di trú New Zealand (Immigration New Zealand).',
        '**Đang chờ:** Kết quả xét duyệt visa từ Immigration New Zealand.',
        '**Gia đình cần thực hiện:**\n- Kiểm tra thông tin trên Offer of Place (họ tên, ngày sinh, khóa học) và báo ngay cho chuyên viên nếu có sai sót.\n- Chuẩn bị hồ sơ tài chính và các giấy tờ bổ sung theo danh sách chuyên viên cung cấp.\n- Em {{tenHocSinh}} thực hiện khám sức khỏe theo chỉ định nếu Sở Di trú yêu cầu.',
        '**Bước tiếp theo:** Khi có kết quả visa, chúng tôi sẽ thông báo ngay cho Quý gia đình.',
        NEXT_UPDATE
      ),
    },
    Germany: {
      subject: SUBJECT,
      body: body(
        'Catholic MTA vui mừng thông báo em {{tenHocSinh}} đã nhận được Giấy báo nhập học (Zulassungsbescheid) từ {{truong}}.',
        '**Tình trạng hiện tại:** Giấy báo nhập học được cấp ngày {{ngayCapThuMoi}}. Chúng tôi đang hoàn thiện hồ sơ xin visa du học Đức (Student Visa / Quốc gia D).',
        '**Đang chờ:** Lịch hẹn nộp hồ sơ tại Đại sứ quán/Tổng Lãnh sự quán Đức hoặc Trung tâm tiếp nhận VFS Global.',
        '**Gia đình cần thực hiện:**\n- Kiểm tra thông tin trên Giấy báo nhập học và báo ngay cho chuyên viên nếu có sai sót.\n- Hoàn tất thủ tục mở tài khoản phong tỏa (Sperrkonto) và mua bảo hiểm y tế theo hướng dẫn.\n- Chuẩn bị đầy đủ giấy tờ gốc và bản dịch công chứng theo danh mục chuyên viên cung cấp.',
        '**Bước tiếp theo:** Chúng tôi sẽ đồng hành hướng dẫn em {{tenHocSinh}} chuẩn bị cho buổi nộp hồ sơ xin visa.',
        NEXT_UPDATE
      ),
    },
    France: {
      subject: SUBJECT,
      body: body(
        'Catholic MTA vui mừng thông báo em {{tenHocSinh}} đã nhận được Thư chấp thuận nhập học từ {{truong}}.',
        '**Tình trạng hiện tại:** Thư mời được cấp ngày {{ngayCapThuMoi}}. Chúng tôi đang chuẩn bị hồ sơ xin visa du học Pháp (Visa Long Séjour pour Etudes - VLS-TS).',
        '**Đang chờ:** Xác thực hồ sơ Campus France và lịch hẹn nộp hồ sơ tại Trung tâm TLScontact.',
        '**Gia đình cần thực hiện:**\n- Kiểm tra thông tin trên Thư chấp thuận và báo ngay cho chuyên viên nếu có sai sót.\n- Hoàn thành quy trình phỏng vấn Campus France (nếu được yêu cầu).\n- Chuẩn bị hồ sơ chứng minh tài chính và chỗ ở tại Pháp theo hướng dẫn của chuyên viên.',
        '**Bước tiếp theo:** Khi hoàn tất hồ sơ, chúng tôi sẽ đặt lịch hẹn nộp visa tại TLScontact cho em {{tenHocSinh}}.',
        NEXT_UPDATE
      ),
    },
  },
};

// Phases that only exist in the US process (visa interview prep, schedule, reminder).
export const US_ONLY_PRESETS = new Set(['gd4_luyen_pv', 'gd5_lich_pv', 'gd6_nhac_pv']);

export function presetAppliesTo(presetKey: string | null | undefined, country?: string | null) {
  if (!presetKey) return false;
  const c = countryKey(country);
  return !(c && c !== 'USA' && US_ONLY_PRESETS.has(presetKey ?? ''));
}

// Picks the text to send: the country version if one exists, otherwise the stage's own template.
export function resolveTemplate(
  presetKey: string | null | undefined,
  country: string | null | undefined,
  fallback: { subject: string; body: string }
) {
  const c = countryKey(country);
  const variant = c ? COUNTRY_VARIANTS[presetKey ?? '']?.[c] : undefined;
  return variant ?? fallback;
}
