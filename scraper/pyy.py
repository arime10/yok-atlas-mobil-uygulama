import requests
import time
import json

# YÖK Atlas'ın arama işlemi için kullandığı gerçek endpoint
API_URL = "https://yokatlas.yok.gov.tr/api/tercih-kilavuz/search"

# Sunucunun bot olduğumuzu düşünüp engellememesi için tarayıcı başlıkları
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json"
}

def fetch_all_pages():
    all_data = []
    current_page = 0
    total_pages = 1 # İlk istekten sonra gerçek değerle güncellenecek
    
    # Her istekte kaç veri çekileceği. 
    # YÖK'ün API'si varsayılan 10 döndürüyor ama hızı artırmak için 100 deneyebiliriz.
    page_size = 100 
    
    while current_page < total_pages:
        # API'nin beklediği filtre ve sayfalama parametreleri
        payload = {
            "filters": {
                "puanTuru": "EA",  # EA, SAY, SÖZ veya DİL olarak değiştirebilirsin
                "universiteId": [],
                "birimGrupId": [],
                "ilKodu": [],
                "birimTuruId": None
            },
            "direction": "ASC",
            "page": current_page,
            "size": page_size,
            "sortBy": "basariSirasi"
        }
        
        print(f"Sayfa {current_page + 1} çekiliyor...")
        
        try:
            response = requests.post(API_URL, headers=headers, json=payload)
            
            if response.status_code != 200:
                print(f"Hata! Status Code: {response.status_code}")
                print(f"Sunucu Yanıtı: {response.text}")
                break
                
            data = response.json()
            
            # İlk sayfa çekildiğinde toplam sayfa sayısını güncelle
            if current_page == 0:
                total_pages = data.get('totalPages', 1)
                total_elements = data.get('totalElements', 0)
                print(f"Toplam {total_elements} kayıt, {total_pages} sayfa bulundu. İşlem başlıyor...\n")
            
            # Gelen sayfanın içeriğini ana listemize ekliyoruz
            if 'content' in data:
                all_data.extend(data['content'])
                
            current_page += 1
            
            # Sunucuyu yormamak ve rate-limit'e takılmamak için yarım saniye bekle
            time.sleep(0.5)
            
        except Exception as e:
            print(f"Bir hata oluştu: {e}")
            break
            
    return all_data

if __name__ == "__main__":
    raw_bolumler = fetch_all_pages()
    
    if raw_bolumler:
        print(f"\nİşlem Tamamlandı! Çekilen Toplam Kayıt Sayısı: {len(raw_bolumler)}")
        
        # Veriyi ileride Firebase'e veya mobil uygulamana atmak üzere JSON dosyası olarak kaydet
        # ensure_ascii=False ile Türkçe karakterlerin (ş, ğ, vb.) bozulmasını engelliyoruz
        with open('yokatlas_ea_2026.json', 'w', encoding='utf-8') as f:
            json.dump(raw_bolumler, f, ensure_ascii=False, indent=4)
            
        print("Veriler 'yokatlas_ea_2026.json' dosyasına başarıyla kaydedildi.")