"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, MapPin, Grid, Video, ClipboardList, UserCheck, CalendarDays, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Psikolog veri tipi
type Profile = {
  id: string;
  slug: string;
  full_name: string;
  title: string;
  session_types: string[];
  avatar_url: string | null;
};

export default function HomePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtre State'leri
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("");
  const [therapyType, setTherapyType] = useState("");

  const supabase = createClient();

  // Sayfa yüklendiğinde psikologları Supabase'den çek
  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      
      // DİKKAT: "profiles" tablosu yerine güvenli olan "public_profiles" view'ını kullanıyoruz
      const { data, error } = await supabase
        .from("public_profiles")
        .select("id, slug, full_name, title, session_types, avatar_url");

      if (data) {
        setProfiles(data);
      }
      if (error) {
        console.error("Psikologlar çekilirken hata oluştu:", error.message);
      }
      setLoading(false);
    };

    fetchProfiles();
  }, [supabase]);

  // Filtreleme Mantığı
  const filteredProfiles = profiles.filter((profile) => {
    // İsim veya Unvan araması
    const matchName = 
      profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      profile.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Kategori/Terapi Türü eşleşmesi (Veritabanındaki session_types dizisinde arıyoruz)
    const matchCategory = !category || category === "" || profile.session_types?.includes(category);
    const matchTherapy = !therapyType || therapyType === "" || profile.session_types?.includes(therapyType);

    return matchName && matchCategory && matchTherapy;
  });
    return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-2xl font-bold text-teal-700 tracking-tight">
                PsikoPanel
              </Link>
            </div>
            <div className="flex space-x-4 items-center">
              <Link
                href="/auth/login"
                className="text-sm font-medium text-slate-600 hover:text-teal-700 transition-colors"
              >
                Psikolog Girişi
              </Link>
              <Link
                href="/auth/register"
                className="text-sm font-medium bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
              >
                Psikolog Kayıt Ol
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO & FILTER SECTION */}
      <main className="flex-grow">
        <section className="bg-gradient-to-b from-teal-50 to-slate-50 py-16 lg:py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
              İçsel Yolculuğunuza Doğru İlk Adımı Atın
            </h1>
            <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto">
              Alanında uzman psikologlar arasından ihtiyacınıza en uygun olanı bulun, 
              kriterlerinize göre filtreleyin ve hemen görüşmeye başlayın.
            </p>

            {/* DETAYLI FİLTRELEME KARTI */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xl border border-slate-100 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Anahtar Kelime / İsim */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Uzman veya Unvan</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="İsim veya anahtar kelime"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Konum (Şu an görsel) */}
                <div className="relative opacity-70 cursor-not-allowed" title="Yakında eklenecek">
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Konum</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <select disabled className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none appearance-none text-slate-500 cursor-not-allowed">
                      <option value="">Tüm Şehirler</option>
                    </select>
                  </div>
                </div>

                {/* Uzmanlık Alanı */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Kategori</label>
                  <div className="relative">
                    <Grid className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none appearance-none text-slate-700"
                    >
                      <option value="">Tüm Uzmanlıklar</option>
                      <option value="Bireysel Terapi">Bireysel Terapi</option>
                      <option value="Çift Terapisi">Çift Terapisi</option>
                      <option value="Çocuk ve Ergen">Çocuk ve Ergen</option>
                      <option value="Aile Danışmanlığı">Aile Danışmanlığı</option>
                    </select>
                  </div>
                </div>

                {/* Terapi Türü */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Terapi Türü</label>
                  <div className="relative">
                    <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <select 
                      value={therapyType}
                      onChange={(e) => setTherapyType(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none appearance-none text-slate-700"
                    >
                      <option value="">Fark Etmez</option>
                      <option value="Online Seans">Online Terapi</option>
                      <option value="Yüz Yüze">Yüz Yüze Terapi</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PSİKOLOG LİSTELEME (SONUÇLAR) BÖLÜMÜ */}
        <section className="py-12 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8 border-b border-slate-200 pb-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">Psikologlarımız</h2>
              <span className="text-sm text-slate-500">{filteredProfiles.length} uzman bulundu</span>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
                <p className="mt-4 text-slate-500">Uzmanlar yükleniyor...</p>
              </div>
            ) : filteredProfiles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProfiles.map((profile) => (
                  <Link href={`/${profile.slug}`} key={profile.id} className="group block">
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
                      <div className="flex flex-col items-center text-center">
                        {/* Avatar */}
                        <div className="w-24 h-24 rounded-full bg-teal-50 border-4 border-white shadow-sm flex items-center justify-center overflow-hidden mb-4">
                          {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-10 h-10 text-teal-300" />
                          )}
                        </div>
                        
                        {/* Bilgiler */}
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                          {profile.full_name}
                        </h3>
                        <p className="text-sm font-medium text-teal-600 mb-4">{profile.title}</p>
                        
                        {/* Uzmanlık Etiketleri */}
                        <div className="flex flex-wrap justify-center gap-2 mb-6">
                          {profile.session_types?.slice(0, 2).map((type, index) => (
                            <span key={index} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                              {type}
                            </span>
                          ))}
                          {profile.session_types && profile.session_types.length > 2 && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                              +{profile.session_types.length - 2}
                            </span>
                          )}
                        </div>

                        {/* Profil Butonu */}
                        <div className="w-full py-2 bg-slate-50 text-slate-700 rounded-lg text-sm font-medium group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors">
                          Profili İncele
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                <UserCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">Sonuç bulunamadı</h3>
                <p className="text-slate-500 mt-2">Arama kriterlerinizi değiştirerek tekrar deneyebilirsiniz.</p>
              </div>
            )}
          </div>
        </section>

        {/* NASIL ÇALIŞIR BÖLÜMÜ */}
        <section className="py-16 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900">Süreç Nasıl İşler?</h2>
              <p className="mt-4 text-slate-600">Sadece 3 basit adımda terapi sürecinize başlayın.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-4">
                  <ClipboardList className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">1. İhtiyacını Belirle</h3>
                <p className="text-slate-600">
                  Size en uygun desteği bulabilmemiz için konum, uzmanlık alanı ve terapi türü gibi kriterlerinizi seçin.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-4">
                  <UserCheck className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">2. Uzmanını Bul</h3>
                <p className="text-slate-600">
                  Filtrelerinize uyan uzmanlarımızı inceleyin, profillerini okuyun ve size en güven veren psikoloğu seçin.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-4">
                  <CalendarDays className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">3. Randevunu Oluştur</h3>
                <p className="text-slate-600">
                  Uzmanın takviminden size uygun olan tarih ve saati seçerek randevunuzu kolayca onaylayın.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm">
        <p>© {new Date().getFullYear()} PsikoPanel. Tüm hakları saklıdır.</p>
      </footer>
    </div>
  );
}
