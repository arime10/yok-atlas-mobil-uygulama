# 🎓 YÖK Atlas Tercih Rehberi (React Native & Python)

Bu proje, YÖK Atlas verilerini kullanarak üniversite adaylarının istedikleri bölümleri filtreleyebildiği, kendi tercih listelerini oluşturabildiği ve bu listeyi PDF olarak dışa aktarabildiği **offline-first** (çevrimdışı çalışabilen) bir mobil uygulamadır.

Veriler, YÖK Atlas'ın arka plan API'si (DevTools üzerinden sniff edilerek) analiz edildikten sonra **Python** ile çekilmiş ve JSON formatında mobil uygulamaya entegre edilmiştir.

## ✨ Uygulama Özellikleri

*   🚀 **Yüksek Performans:** Binlerce bölüm ve üniversite verisi, FlatList optimizasyonları (initialNumToRender, removeClippedSubviews) sayesinde sıfır kasma ile anlık listelenir.
*   🔍 **Gelişmiş Filtreleme Modülü:** 
    *   Anahtar kelime ile anlık arama (Üniversite veya Bölüm adına göre).
    *   Minimum ve Maksimum "Başarı Sırası" aralığı belirleme.
    *   Modal tabanlı özel seçim ekranları üzerinden spesifik Üniversite veya Bölüm grubu (Örn: Hukuk, İşletme vb.) seçimi.
*   ⭐ **Çevrimdışı Tercih Listesi:** Kullanıcılar beğendikleri bölümleri listelerine ekleyebilir. Veriler AsyncStorage kullanılarak cihaz hafızasında (lokal) tutulur.
*   📄 **PDF Olarak Paylaşma:** Oluşturulan tercih listesi, başarı sırasına göre otomatik dizilir ve tek tıkla ÖSYM şablonuna benzer şık bir tablo halinde PDF'e dönüştürülerek (WhatsApp, Mail vb. üzerinden) anında paylaşılabilir.

---

## ⚙️ Veri Toplama Süreci (Python Web Scraping)

YÖK Atlas, altyapısını React tabanlı bir SPA'ya geçirdiği için geleneksel HTML kazıma (scraping) yöntemleri çalışmamaktadır. Bu projede veri, doğrudan sitenin backend'i ile haberleşen bir Python betiği ile elde edilmiştir:

1.  **Network Analizi:** Tarayıcı üzerinden YÖK Atlas aramaları dinlenmiş, tercih-kilavuz/search endpoint'i ve beklenen payload/header yapıları tespit edilmiştir.
2.  **Otomasyon (Python requests):** Sayfalama (pagination) mantığına uygun olarak bir while döngüsü ile sayfalar 100'erlik paketler halinde çekilmiştir.
3.  **Rate-Limit Koruması:** Sunucuyu yormamak ve engellenmemek için istekler arasına time.sleep() eklenmiştir.
4.  **Veri Temizliği:** Gelen veri sadeleştirilmiş ve Türkçe karakter kodlaması (UTF-8) korunarak JSON dosyasına dönüştürülmüştür.

> ⚠️ **Veri Seti Hakkında Önemli Not (Sadece EA Bölümleri):**  
> Projede yer alan scraper/pyy.py scriptindeki API payload ayarlarında, veri hacmini optimize etmek amacıyla puan türü spesifik olarak **"EA" (Eşit Ağırlık)** olarak filtrelenmiştir. Bu nedenle mevcut JSON dosyasında ve mobil uygulamada yalnızca Eşit Ağırlık bölümleri bulunmaktadır. Eğer SAY, SÖZ veya DİL bölümlerini de çekmek isterseniz, Python dosyasındaki "puanTuru": "EA" değerini ilgili puan türü ile değiştirip scripti tekrar çalıştırmanız yeterlidir.

---

## 🛠️ Kullanılan Teknolojiler

**Mobil Uygulama (Frontend):**
*   React Native
*   Expo (Geliştirme ve APK Derleme)
*   @react-native-async-storage/async-storage (Lokal Veritabanı)
*   expo-print & expo-sharing (HTML'den PDF oluşturma ve paylaşma)

**Veri Çekme (Backend/Data):**
*   Python 3
*   requests kütüphanesi
*   JSON veri modellemesi

---

## 🚀 Kurulum ve Çalıştırma

Projeyi kendi bilgisayarınızda çalıştırabilmek ve eksiksiz deneyimleyebilmek için aşağıdaki adımları izleyebilirsiniz. (Projeye dahil edilmeyen node_modules kütüphanelerinin indirilmesi için 2. adım zorunludur).

### 1. Depoyu Klonlayın
git clone https://github.com/arime10/yok-atlas-mobil-uygulama.git
cd yok-atlas-mobil-uygulama

### 2. Gerekli Kütüphaneleri Yükleyin
npm install

### 3. Uygulamayı Başlatın
npx expo start -c

(Gelen QR kodu cihazınızdaki Expo Go uygulaması ile okutarak hemen test edebilirsiniz.)



**Geliştirici:** Emirhan Dağ  
*Yazılım Mühendisi | Full-Stack & Mobil Uygulama Geliştirici*
