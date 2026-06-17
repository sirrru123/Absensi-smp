// ==========================================
// 1. FUNGSI LOGIN (SISWA, ORANG TUA, & ADMIN)
// ==========================================
function login() {
  const role = document.getElementById("roleSelect").value;
  const pass = document.getElementById("passwordInput").value;

  // Bersihkan sisa-sisa style batasan Ortu dari sesi login sebelumnya
  const kustomStyle = document.getElementById("ortuStyle");
  if (kustomStyle) kustomStyle.remove();

  // Reset tampilan header kolom aksi tabel agar muncul kembali
  const kolAksi = document.querySelectorAll(".kolom-aksi");
  kolAksi.forEach(th => th.style.display = "");

  // Tampilkan kembali tombol excel bawaan admin
  const btnExcel = document.getElementById("btnExcel");
  if(btnExcel) btnExcel.style.display = "";

  // A. LOGIN SISWA
  if (role === "user" && pass === "smp123") {
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("userPage").classList.remove("hidden");
  } 
  // B. LOGIN ORANG TUA (Proteksi: Sembunyikan tombol Hapus & Download)
  else if (role === "parent" && pass === "ortu123") {
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("adminPage").classList.remove("hidden");

    const filterInput = document.getElementById("filterTanggal");
    if (filterInput) {
      filterInput.value = new Date().toISOString().split('T')[0];
    }

    loadAbsensi();

    // Sembunyikan kolom "Aksi" & tombol "Download Excel" untuk Orang Tua
    kolAksi.forEach(th => th.style.display = "none");
    
    const styleOrtu = document.createElement("style");
    styleOrtu.id = "ortuStyle";
    styleOrtu.innerHTML = `
      table td:nth-child(3) { display: none !important; }
      #btnExcel { display: none !important; }
    `;
    document.head.appendChild(styleOrtu);
  }
  // C. LOGIN ADMIN (Akses Penuh)
  else if (role === "admin" && pass === "admin123") {
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("adminPage").classList.remove("hidden");

    const filterInput = document.getElementById("filterTanggal");
    if (filterInput) {
      filterInput.value = new Date().toISOString().split('T')[0];
    }

    loadAbsensi();
  } 
  else {
    alert("Password Salah");
  }
}

// ==========================================
// 2. FUNGSI SUBMIT ABSENSI (SISWA)
// ==========================================
function submitAbsensi() {
  const namaInput = document.getElementById("inputNama").value;
  const kelas = document.getElementById("inputKelas").value;
  const ket = document.getElementById("inputKeterangan").value;

  if (!namaInput || !kelas) {
    alert("Lengkapi data terlebih dahulu!");
    return;
  }

  const nama = namaInput.trim();
  const namaClean = nama.toLowerCase().replace(/\s+/g, ' '); 

  const tanggal = new Date().toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const tanggalFilter = new Date().toISOString().split('T')[0];

  db.ref("absensi_smp").push({
    nama,         
    namaClean,    
    kelas,        
    ket,
    tanggal,
    tanggalFilter
  });

  alert("Absensi berhasil!");

  document.getElementById("inputNama").value = "";
  document.getElementById("inputKelas").value = "";
}

// ==========================================
// 3. FUNGSI DASHBOARD MONITORING
// ==========================================
function loadAbsensi() {
  const body7 = document.getElementById("tableBody7");
  const body8 = document.getElementById("tableBody8");
  const body9 = document.getElementById("tableBody9");

  const filterInput = document.getElementById("filterTanggal");
  if (!filterInput) return;
  
  const tanggalTerpilih = filterInput.value;
  if (!tanggalTerpilih) return;

  const opsiFormat = { day: "numeric", month: "long", year: "numeric" };
  const tanggalTeksIndonesia = new Date(tanggalTerpilih).toLocaleDateString("id-ID", opsiFormat);

  db.ref("absensi_smp").on("value", function(snapshot) {
    if(body7) body7.innerHTML = "";
    if(body8) body8.innerHTML = "";
    if(body9) body9.innerHTML = "";

    let hadir = 0, izin = 0, sakit = 0, total = 0;
    let siswa = {}; 

    window.allAbsensiData = snapshot.val() || {};

    snapshot.forEach(child => {
      const data = child.val();
      const key = child.key;

      if (!data || !data.tanggal) return;

      if (data.tanggal.includes(tanggalTeksIndonesia) || data.tanggalFilter === tanggalTerpilih) {
        
        total++;
        if (data.ket === "Hadir") hadir++;
        if (data.ket === "Izin") izin++;
        if (data.ket === "Sakit") sakit++;

        const namaSiswaClean = data.namaClean ? data.namaClean : data.nama.toLowerCase().trim().replace(/\s+/g, ' ');
        const kelasSiswa = data.kelas || "7";

        const kunciGabungan = `${namaSiswaClean}-${kelasSiswa}`;

        if (!siswa[kunciGabungan]) {
          siswa[kunciGabungan] = {
            namaTampilan: data.nama,
            kelas: kelasSiswa,
            namaClean: namaSiswaClean,
            keysHariIni: []
          };
        }
        
        siswa[kunciGabungan].keysHariIni.push(key);
      }
    });

    if(document.getElementById("jumlahHadir")) document.getElementById("jumlahHadir").innerText = hadir;
    if(document.getElementById("jumlahIzin")) document.getElementById("jumlahIzin").innerText = izin;
    if(document.getElementById("jumlahSakit")) document.getElementById("jumlahSakit").innerText = sakit;
    if(document.getElementById("jumlahTotal")) document.getElementById("jumlahTotal").innerText = total;

    // Render data siswa ke baris tabel web
    Object.keys(siswa).forEach(kunci => {
      const data = siswa[kunci];
      const row = document.createElement("tr");

      const stringKeys = data.keysHariIni.join(",");
      const namaAman = data.namaTampilan.replace(/'/g, "\\'");
      const namaCleanAman = data.namaClean.replace(/'/g, "\\'");

      row.innerHTML = `
        <td style="color: black; font-weight: 500;">${data.namaTampilan}</td>
        <td>
          <button onclick="lihatHistory('${namaAman}', '${namaCleanAman}', '${data.kelas}')">Lihat History</button>
        </td>
        <td class="kolom-aksi">
          <button onclick="hapusSiswaHariIni('${namaAman}', '${stringKeys}')" style="background: linear-gradient(135deg, #ef4444, #dc2626);">
            Hapus
          </button>
        </td>
      `;

      if (data.kelas === "7" && body7) body7.appendChild(row);
      if (data.kelas === "8" && body8) body8.appendChild(row);
      if (data.kelas === "9" && body9) body9.appendChild(row);
    });
  });
}

// ==========================================
// 4. FUNGSI RIWAYAT / HISTORY SISWA
// ==========================================
function lihatHistory(namaTampilan, namaClean, kelas) {
  const modalPage = document.getElementById("historyModal");
  const modalNama = document.getElementById("historyNama");
  const modalBody = document.getElementById("historyBody");

  if(modalNama) modalNama.innerText = "History " + namaTampilan + " (Kelas " + kelas + ")";
  
  let html = "";
  const semuaData = window.allAbsensiData || {};

  Object.keys(semuaData).forEach(key => {
    const data = semuaData[key];
    if (!data || !data.nama) return;

    const kunciDataNama = data.namaClean ? data.namaClean : data.nama.toLowerCase().trim().replace(/\s+/g, ' ');
    const kunciDataKelas = data.kelas || "7";
    
    if (kunciDataNama === namaClean && kunciDataKelas === kelas) {
      html += `
        <tr>
          <td style="padding: 10px; text-align: center;">${data.tanggal}</td>
          <td style="padding: 10px; text-align: center; font-weight: bold;">${data.ket}</td>
        </tr>
      `;
    }
  });

  if(modalBody) modalBody.innerHTML = html;
  if(modalPage) modalPage.classList.remove("hidden");
}

function tutupHistory() {
  const modalPage = document.getElementById("historyModal");
  if(modalPage) modalPage.classList.add("hidden");
}

// ==========================================
// 5. FUNGSI DOWNLOAD EXCEL (OTOMATIS URUT KELAS 7, 8, 9)
// ==========================================
function downloadExcel() {
  if (!window.allAbsensiData || Object.keys(window.allAbsensiData).length === 0) {
    alert("Tidak ada data untuk di-download!");
    return;
  }

  let listData = [];
  const semuaData = window.allAbsensiData;

  Object.keys(semuaData).forEach(key => {
    const data = semuaData[key];
    if (data && data.nama) {
      listData.push({
        nama: data.nama.trim(),
        kelas: parseInt(data.kelas) || 7,
        tanggal: data.tanggal,
        ket: data.ket
      });
    }
  });

  // LOGIC SORTING: Mengurutkan otomatis dari kelas terkecil ke terbesar (7 -> 8 -> 9)
  listData.sort((a, b) => {
    if (a.kelas !== b.kelas) {
      return a.kelas - b.kelas;
    }
    return a.nama.localeCompare(b.nama); // Jika kelasnya sama, urut berdasarkan abjad nama
  });

  // Menggunakan pembatas titik koma (;) agar otomatis rapi di Excel laptop kamu
  let csv = "Nama;Kelas;Tanggal;Keterangan\n";
  
  listData.forEach(item => {
    csv += `"${item.nama}";"Kelas ${item.kelas}";"${item.tanggal}";"${item.ket}"\n`;
  });

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "absensi_smp_urut_kelas.csv";
  link.click();
}

// ==========================================
// 6. FUNGSI HAPUS ABSENSI HARI INI
// ==========================================
function hapusSiswaHariIni(nama, stringKeys) {
  if (!stringKeys) {
    alert("Data tidak ditemukan atau sudah terhapus.");
    return;
  }

  if (!confirm(`Apakah Anda yakin ingin menghapus data absensi ${nama} khusus pada tanggal terpilih ini?`)) {
    return;
  }

  const keysArray = stringKeys.split(",");
  const hapusPromises = keysArray.map(key => db.ref("absensi_smp/" + key).remove());

  Promise.all(hapusPromises)
    .then(() => {
      alert(`Data absensi ${nama} pada tanggal terpilih berhasil dihapus!`);
    })
    .catch(error => {
      alert("Gagal menghapus data: " + error.message);
    });
}

// ==========================================
// 7. FUNGSI LOGOUT
// ==========================================
function logout() {
  location.reload();
}