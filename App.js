import React, { useState, useMemo, useEffect } from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Modal,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import uniData from './yokatlas_ea_2026.json';

// --- YARDIMCI BİLEŞEN: Seçim Modalı ---
const SelectionModal = ({ visible, onClose, data, onSelect, title }) => {
  const [modalSearch, setModalSearch] = useState('');
  
  const filteredList = data.filter(item => 
    item.toLowerCase().includes(modalSearch.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCloseText}>Kapat</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.modalSearchInput}
            placeholder="Listede ara..."
            value={modalSearch}
            onChangeText={setModalSearch}
          />
          <FlatList
            data={filteredList}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => { onSelect(item); onClose(); setModalSearch(''); }}
              >
                <Text style={styles.modalItemText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [savedList, setSavedList] = useState([]);

  // Arama / Filtre State'leri
  const [searchText, setSearchText] = useState('');
  const [minRank, setMinRank] = useState('');
  const [maxRank, setMaxRank] = useState('');
  const [selectedUni, setSelectedUni] = useState(null);
  const [selectedBirim, setSelectedBirim] = useState(null);
  const [filteredData, setFilteredData] = useState(uniData);
  const [showFilters, setShowFilters] = useState(false);

  const [uniModalVisible, setUniModalVisible] = useState(false);
  const [birimModalVisible, setBirimModalVisible] = useState(false);

  useEffect(() => {
    loadSavedItems();
  }, []);

  const loadSavedItems = async () => {
    try {
      const stored = await AsyncStorage.getItem('@tercihlerim');
      if (stored) setSavedList(JSON.parse(stored));
    } catch (e) {
      console.error("Yükleme hatası:", e);
    }
  };

  const handleSave = async (item) => {
    const isAlreadySaved = savedList.some(x => x.osymKilavuzId === item.osymKilavuzId);
    if (isAlreadySaved) {
      Alert.alert("Bilgi", "Bu bölüm zaten tercih listenizde var.");
      return;
    }
    const newList = [...savedList, item];
    setSavedList(newList);
    await AsyncStorage.setItem('@tercihlerim', JSON.stringify(newList));
  };

  const handleRemove = async (id) => {
    const newList = savedList.filter(x => x.osymKilavuzId !== id);
    setSavedList(newList);
    await AsyncStorage.setItem('@tercihlerim', JSON.stringify(newList));
  };

  const uniqueUniversities = useMemo(() => {
    const unis = uniData.map(item => item.universiteAdi).filter(Boolean);
    return [...new Set(unis)].sort();
  }, []);

  const uniqueBirimler = useMemo(() => {
    const birimler = uniData.map(item => item.birimGrupAdi).filter(Boolean);
    return [...new Set(birimler)].sort();
  }, []);

  useEffect(() => {
    let result = uniData;
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      result = result.filter(item => 
        (item.universiteAdi?.toLowerCase().includes(lowerSearch)) || 
        (item.birimAdi?.toLowerCase().includes(lowerSearch))
      );
    }
    if (selectedUni) result = result.filter(item => item.universiteAdi === selectedUni);
    if (selectedBirim) result = result.filter(item => item.birimGrupAdi === selectedBirim);
    
    if (minRank || maxRank) {
      const min = minRank ? parseInt(minRank) : 0;
      const max = maxRank ? parseInt(maxRank) : 9999999;
      result = result.filter(item => {
        const sira = item.basariSirasi;
        if (!sira) return false;
        return sira >= min && sira <= max;
      });
    }
    setFilteredData(result);
  }, [searchText, minRank, maxRank, selectedUni, selectedBirim]);

  const clearFilters = () => {
    setSearchText(''); setMinRank(''); setMaxRank('');
    setSelectedUni(null); setSelectedBirim(null);
  };

  const sortedSavedList = useMemo(() => {
    return [...savedList].sort((a, b) => {
      const siraA = a.basariSirasi || 9999999;
      const siraB = b.basariSirasi || 9999999;
      return siraA - siraB;
    });
  }, [savedList]);

  // --- PDF OLUŞTURMA VE PAYLAŞMA FONKSİYONU ---
  const createAndSharePDF = async () => {
    if (sortedSavedList.length === 0) {
      Alert.alert("Hata", "PDF oluşturmak için listende en az 1 bölüm olmalıdır.");
      return;
    }

    // HTML Tablo formatında içeriği dinamik olarak oluştur
    let tableRows = '';
    sortedSavedList.forEach((item, index) => {
      const sira = item.basariSirasi || 'Dolmadı';
      const puan = item.minPuan ? Number(item.minPuan).toFixed(2) : '-';
      tableRows += `
        <tr>
          <td>${index + 1}</td>
          <td>${item.universiteAdi}</td>
          <td>${item.birimAdi}</td>
          <td>${item.bursOraniAdi || 'Devlet'}</td>
          <td>${sira}</td>
          <td>${puan}</td>
        </tr>
      `;
    });

    const htmlContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
            h1 { text-align: center; color: #1D4ED8; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #CBD5E1; padding: 10px; text-align: left; }
            th { background-color: #F1F5F9; color: #0F172A; font-weight: bold; }
            tr:nth-child(even) { background-color: #F8FAFC; }
          </style>
        </head>
        <body>
          <h1>YKS 2026 Tercih Listem</h1>
          <table>
            <thead>
              <tr>
                <th>Sıra</th>
                <th>Üniversite</th>
                <th>Bölüm</th>
                <th>Durum/Burs</th>
                <th>Başarı Sırası</th>
                <th>Puan</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <p style="text-align: right; margin-top: 20px; font-size: 10px; color: #64748B;">Bu belge YÖK Atlas Tercih Rehberi uygulamasından oluşturulmuştur.</p>
        </body>
      </html>
    `;

    try {
      // HTML'den PDF dosyası üret
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      // Üretilen PDF dosyasını paylaşım diyaloğuyla aç
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      } else {
        Alert.alert("Hata", "Cihazınızda paylaşım özelliği desteklenmiyor.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Hata", "PDF oluşturulurken bir sorun oluştu.");
    }
  };

  const renderItem = ({ item }) => {
    const puanFormatted = item.minPuan ? Number(item.minPuan).toFixed(2) : (item.minPuan1 ? Number(item.minPuan1).toFixed(2) : '-');
    const isSaved = savedList.some(x => x.osymKilavuzId === item.osymKilavuzId);

    return (
      <View style={styles.card}>
        <Text style={styles.uniName}>{item.universiteAdi}</Text>
        <Text style={styles.progName}>{item.birimAdi}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoText}>Kontenjan: {item.kontenjan || '-'}</Text>
          <Text style={styles.infoText}>Olanak: {item.bursOraniAdi || 'Ücretli / Devlet'}</Text>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Sıra: {item.basariSirasi || 'Dolmadı'}</Text>
          </View>
          <View style={[styles.badge, styles.badgePuan]}>
            <Text style={[styles.badgeText, styles.badgeTextPuan]}>Puan: {puanFormatted}</Text>
          </View>
        </View>

        {activeTab === 'home' ? (
          <TouchableOpacity style={[styles.actionBtn, isSaved && styles.actionBtnSaved]} onPress={() => handleSave(item)} disabled={isSaved}>
            <Text style={[styles.actionBtnText, isSaved && styles.actionBtnTextSaved]}>{isSaved ? "Listeye Eklendi" : "Tercih Listeme Ekle"}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleRemove(item.osymKilavuzId)}>
            <Text style={styles.deleteBtnText}>Listeden Çıkar</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={{ flex: 1 }}>
        {activeTab === 'home' ? (
          <>
            <View style={styles.headerContainer}>
              <Text style={styles.headerTitle}>Bölüm Arama</Text>
              <TextInput style={styles.searchInput} placeholder="Kelime ile hızlı ara..." placeholderTextColor="#888" value={searchText} onChangeText={setSearchText} />
              <TouchableOpacity style={styles.filterToggleBtn} onPress={() => setShowFilters(!showFilters)}>
                <Text style={styles.filterToggleText}>{showFilters ? "Gelişmiş Filtreleri Gizle" : "Gelişmiş Filtreleri Aç"}</Text>
              </TouchableOpacity>
              {showFilters && (
                <View style={styles.advancedFilters}>
                  <View style={styles.rankContainer}>
                    <TextInput style={styles.rankInput} placeholder="Min Sıra" keyboardType="numeric" value={minRank} onChangeText={setMinRank} />
                    <Text style={styles.rankDash}>-</Text>
                    <TextInput style={styles.rankInput} placeholder="Max Sıra" keyboardType="numeric" value={maxRank} onChangeText={setMaxRank} />
                  </View>
                  <TouchableOpacity style={styles.selectBtn} onPress={() => setUniModalVisible(true)}>
                    <Text style={styles.selectBtnText} numberOfLines={1}>{selectedUni || "Üniversite Seç..."}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.selectBtn} onPress={() => setBirimModalVisible(true)}>
                    <Text style={styles.selectBtnText} numberOfLines={1}>{selectedBirim || "Bölüm Seç..."}</Text>
                  </TouchableOpacity>
                  {(selectedUni || selectedBirim || minRank || maxRank) && (
                    <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
                      <Text style={styles.clearBtnText}>Filtreleri Temizle</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              <Text style={styles.resultCount}>{filteredData.length} bölüm bulundu</Text>
            </View>

            <FlatList
              data={filteredData} keyExtractor={(item, index) => item.osymKilavuzId ? item.osymKilavuzId.toString() : index.toString()}
              renderItem={renderItem} initialNumToRender={10} maxToRenderPerBatch={10} windowSize={5} removeClippedSubviews={true}
              contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}
            />
          </>
        ) : (
          <>
            <View style={styles.headerContainer}>
              <View style={styles.profileHeaderRow}>
                <Text style={styles.headerTitle}>Benim Tercihlerim</Text>
                {/* PDF Paylaş Butonu */}
                {savedList.length > 0 && (
                  <TouchableOpacity style={styles.pdfBtn} onPress={createAndSharePDF}>
                    <Text style={styles.pdfBtnText}>📄 Paylaş</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.resultCount}>Sıralamaya göre dizilmiştir. Toplam {savedList.length} kayıt.</Text>
            </View>
            
            {savedList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Henüz listene bir bölüm eklemedin.</Text>
              </View>
            ) : (
              <FlatList
                data={sortedSavedList} keyExtractor={(item) => item.osymKilavuzId.toString()}
                renderItem={renderItem} contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}
              />
            )}
          </>
        )}
      </View>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setActiveTab('home')}>
          <Text style={[styles.navBtnText, activeTab === 'home' && styles.navBtnTextActive]}>🔍 Arama</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => setActiveTab('profile')}>
          <Text style={[styles.navBtnText, activeTab === 'profile' && styles.navBtnTextActive]}>⭐ Profilim ({savedList.length})</Text>
        </TouchableOpacity>
      </View>

      <SelectionModal visible={uniModalVisible} onClose={() => setUniModalVisible(false)} data={uniqueUniversities} onSelect={setSelectedUni} title="Üniversite Seç" />
      <SelectionModal visible={birimModalVisible} onClose={() => setBirimModalVisible(false)} data={uniqueBirimler} onSelect={setSelectedBirim} title="Bölüm Seç" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  headerContainer: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EAEAEA' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  searchInput: { backgroundColor: '#F0F2F5', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, fontSize: 16, color: '#333', marginTop: 12 },
  filterToggleBtn: { alignSelf: 'flex-start', marginTop: 12, paddingVertical: 4 },
  filterToggleText: { color: '#1D4ED8', fontWeight: '600', fontSize: 14 },
  advancedFilters: { marginTop: 12, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  rankContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  rankInput: { flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  rankDash: { fontSize: 18, color: '#64748B' },
  selectBtn: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, marginBottom: 10 },
  selectBtnText: { color: '#334155', fontSize: 14 },
  clearBtn: { backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  clearBtnText: { color: '#B91C1C', fontWeight: 'bold' },
  resultCount: { fontSize: 12, color: '#666', marginTop: 12, textAlign: 'right' },
  
  profileHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pdfBtn: { backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  pdfBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

  listContainer: { padding: 16 },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  uniName: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 4 },
  progName: { fontSize: 17, fontWeight: 'bold', color: '#0F172A', marginBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  infoText: { fontSize: 13, color: '#475569' },
  statsContainer: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  badge: { backgroundColor: '#EFF6FF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, flex: 1, alignItems: 'center' },
  badgePuan: { backgroundColor: '#F0FDF4' },
  badgeText: { color: '#1D4ED8', fontWeight: '700', fontSize: 14 },
  badgeTextPuan: { color: '#15803D' },
  
  actionBtn: { backgroundColor: '#2563EB', padding: 12, borderRadius: 8, alignItems: 'center' },
  actionBtnSaved: { backgroundColor: '#E2E8F0' },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  actionBtnTextSaved: { color: '#64748B' },
  
  deleteBtn: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', padding: 12, borderRadius: 8, alignItems: 'center' },
  deleteBtnText: { color: '#DC2626', fontWeight: 'bold', fontSize: 14 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#64748B', fontSize: 16 },

  bottomNav: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EAEAEA', paddingBottom: 24, paddingTop: 12 },
  navBtn: { flex: 1, alignItems: 'center' },
  navBtnText: { fontSize: 15, color: '#64748B', fontWeight: '600' },
  navBtnTextActive: { color: '#2563EB', fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '80%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  modalCloseText: { color: '#1D4ED8', fontWeight: 'bold', fontSize: 16 },
  modalSearchInput: { backgroundColor: '#F1F5F9', padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 16 },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalItemText: { fontSize: 16, color: '#334155' }
});