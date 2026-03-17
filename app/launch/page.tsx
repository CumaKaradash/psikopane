import Link from 'next/link'
import { ArrowRight, CheckCircle, Star, Users, Zap, Shield } from 'lucide-react'

export default function LaunchPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-full mb-6">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            PsikoPanel
          </h1>
          <p className="text-xl text-purple-200 max-w-2xl mx-auto">
            Modern psikoloji yönetim platformunuzla tanışın. Pratik, hızlı ve güvenilir.
          </p>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto">
          {/* Features Grid */}
          <section className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Hasta Yönetimi
              </h3>
              <p className="text-purple-200">
                Hasta kayıtlarını kolayca yönetin ve takip edin.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Güvenli Veri
              </h3>
              <p className="text-purple-200">
                Hassas verileriniz end-to-end şifreleme ile korunur.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4">
                <Star className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Analitik Raporlar
              </h3>
              <p className="text-purple-200">
                Detaylı raporlar ve analizlerle verimliliği artırın.
              </p>
            </div>
          </section>

          {/* Benefits List */}
          <section className="bg-white/5 backdrop-blur-lg rounded-xl p-8 border border-white/10 mb-16">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Neden PsikoPanel?
            </h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-purple-100">Kullanıcı dostu arayüz</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-purple-100">7/24 teknik destek</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-purple-100">GDPR uyumlu</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-purple-100">Mobil uyumlu</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-purple-100">Otomatik yedekleme</span>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Hemen Başlayın
            </h2>
            <p className="text-purple-200 mb-8">
              PsikoPanel'in tüm özelliklerini keşfetmek için giriş yapın.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
              >
                Giriş Yap
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center px-8 py-3 bg-white/10 text-white font-semibold rounded-lg border border-white/20 hover:bg-white/20 transition-colors"
              >
                Ücretsiz Deneyin
              </Link>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/10 text-center">
          <p className="text-purple-300">
            © 2024 PsikoPanel. Tüm hakları saklıdır.
          </p>
        </footer>
      </div>
    </div>
  )
}
