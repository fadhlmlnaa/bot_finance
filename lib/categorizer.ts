export function inferCategoryName(description: string, type: "INCOME" | "EXPENSE"): string {
  const desc = description.toLowerCase().trim();

  if (type === "INCOME") {
    if (/(gaji|salary|payroll|upah)/i.test(desc)) return "Gaji";
    if (/(bonus|thr|insentif|reward)/i.test(desc)) return "Bonus";
    if (/(freelance|proyek|project|side\s*job)/i.test(desc)) return "Freelance";
    if (/(cashback|diskon|refund)/i.test(desc)) return "Cashback & Refund";
    if (/(dividen|investasi|crypto|saham|bunga)/i.test(desc)) return "Investasi";
    if (/(jual|dagang|omset|penjualan)/i.test(desc)) return "Penjualan";
    return "Pemasukan Lainnya";
  }

  // EXPENSE classifications
  if (
    /(sate|nasi|makan|ayam|bebek|mie|bakso|burger|pizza|roti|martabak|geprek|kopi|coffee|cafe|teh|jus|boba|warung|resto|restoran|warteg|snack|jajan|cireng|seblak|cilok|sarapan|lunch|dinner|kfc|mcd)/i.test(
      desc
    )
  ) {
    return "Makanan & Minuman";
  }

  if (
    /(parkir|bensin|pertalite|pertamax|solar|spbu|tol|grab|gojek|gocar|goride|ojol|taxi|taksi|angkot|bus|krl|mrt|kereta|pesawat|tambal\s*ban|cuci\s*motor|cuci\s*mobil|oli|servis|service\s*motor|service\s*mobil)/i.test(
      desc
    )
  ) {
    return "Transportasi & Kendaraan";
  }

  if (
    /(listrik|pln|token|pdam|air|wifi|indihome|biznet|telkom|pulsa|kuota|data|netflix|spotify|youtube|iuran|bpjs|sewa|kontrakan|kost|kos)/i.test(
      desc
    )
  ) {
    return "Tagihan & Utilitas";
  }

  if (
    /(baju|celana|sepatu|tas|belanja|supermarket|minimarket|indomaret|alfamart|shopee|tokopedia|lazada|tiktok\s*shop|mall|skincare|makeup)/i.test(
      desc
    )
  ) {
    return "Belanja";
  }

  if (/(obat|apotek|dokter|rs|rumah\s*sakit|klinik|vitamin|periksa|medis|lab|laboratorium)/i.test(desc)) {
    return "Kesehatan";
  }

  if (/(nonton|bioskop|cinema|xxi|game|steam|topup|mlbb|ff|valorant|rekreasi|liburan|karaoke|wisata)/i.test(desc)) {
    return "Hiburan";
  }

  if (/(sedekah|infaq|zakat|donasi|amal|kondangan|kado|hadiah)/i.test(desc)) {
    return "Sosial & Amal";
  }

  if (/(buku|kursus|course|udemy|sekolah|kuliah|spp|les)/i.test(desc)) {
    return "Edukasi";
  }

  return "Pengeluaran Lainnya";
}
