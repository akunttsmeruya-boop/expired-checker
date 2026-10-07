// ==================================================
// URL API GOOGLE APPS SCRIPT
// ==================================================

const API_URL =
    'https://script.google.com/macros/s/AKfycbw_kYK9qWddTA7ffxUffFep_8LOeWCee_vjYhPSPKiGz92nI4JlMD5bDQOi3qCnXKha/exec';


// ==================================================
// SEARCH BARCODE
// Menggunakan JSONP agar tidak terkena CORS
// ==================================================

function searchProduct(nomor) {

    const barcodeInput =
        document.getElementById('barcode' + nomor);

    const nameElement =
        document.getElementById('productName' + nomor);

    const barcode =
        barcodeInput.value.trim();

    if (!barcode) {

        nameElement.textContent =
            'Masukkan barcode terlebih dahulu';

        return;
    }

    nameElement.textContent =
        'Mencari produk...';


    // Nama callback unik
    const callbackName =
        'barcodeCallback_' +
        nomor +
        '_' +
        Date.now();


    // Fungsi callback
    window[callbackName] = function(data) {

        if (data.success && data.found) {

            barcodeInput.value =
                data.barcode;

            nameElement.textContent =
                data.prod_nm;

        } else {

            nameElement.textContent =
                'BARCODE TIDAK DITEMUKAN';

        }


        // Hapus callback
        delete window[callbackName];


        // Hapus script
        if (script.parentNode) {
            script.parentNode.removeChild(script);
        }

    };


    // Buat script JSONP
    const script =
        document.createElement('script');


    script.src =
        API_URL +
        '?action=search' +
        '&barcode=' +
        encodeURIComponent(barcode) +
        '&callback=' +
        encodeURIComponent(callbackName);


    // Jika gagal
    script.onerror = function() {

        nameElement.textContent =
            'Gagal terhubung ke server';

        delete window[callbackName];

        if (script.parentNode) {
            script.parentNode.removeChild(script);
        }

    };


    // Jalankan request
    document.body.appendChild(script);
}

// ==================================================
// DATABASE BARCODE LOKAL
// ==================================================

let barcodeDatabase = [];
let barcodeIndex = {};
let databaseReady = false;
let databaseLoading = false;

const DATABASE_STORAGE_KEY =
    'CEK_PRODUK_EXPIRED_DATABASE';

const DATABASE_TIME_KEY =
    'CEK_PRODUK_EXPIRED_DATABASE_TIME';


// ==================================================
// LOAD DATABASE SAAT WEBSITE DIBUKA
// ==================================================

document.addEventListener(
    'DOMContentLoaded',
    function() {

        loadLocalDatabase();

    }
);


// ==================================================
// LOAD DATABASE DARI LOCAL STORAGE
// ==================================================

function loadLocalDatabase() {

    let savedData = null;

    try {

        savedData =
            localStorage.getItem(
                DATABASE_STORAGE_KEY
            );

    } catch (error) {

        console.log(
            'LocalStorage tidak tersedia'
        );

    }


    // ==================================================
    // JIKA ADA DATABASE TERSIMPAN
    // LANGSUNG PAKAI
    // ==================================================

    if (savedData) {

        try {

            barcodeDatabase =
                JSON.parse(savedData);

            buildBarcodeIndex();

            databaseReady = true;

            console.log(
                'Database lokal siap:',
                barcodeDatabase.length,
                'produk'
            );


            // ==================================================
            // UPDATE DATABASE DI BACKGROUND
            // ==================================================

            loadDatabaseFromServer(
                true
            );

            return;

        } catch (error) {

            console.log(
                'Database lokal rusak, load ulang'
            );

        }

    }


    // ==================================================
    // BELUM ADA DATABASE
    // LOAD DARI SERVER
    // ==================================================

    loadDatabaseFromServer(
        false
    );

}


// ==================================================
// LOAD DATABASE DARI GOOGLE APPS SCRIPT
// ==================================================

function loadDatabaseFromServer(background) {

    if (databaseLoading) {
        return;
    }

    databaseLoading = true;


    showDatabaseStatus(
        background
            ? 'Memperbarui database...'
            : 'Memuat database...'
    );


    const callbackName =
        'loadDatabaseCallback_' +
        Date.now();


    window[callbackName] =
        function(data) {

            databaseLoading = false;


            if (
                data &&
                data.success &&
                Array.isArray(data.data)
            ) {

                barcodeDatabase =
                    data.data;


                // ==================================================
                // BUAT INDEX
                // ==================================================

                buildBarcodeIndex();


                databaseReady = true;


                // ==================================================
                // SIMPAN KE LOCAL STORAGE
                // ==================================================

                try {

                    localStorage.setItem(
                        DATABASE_STORAGE_KEY,
                        JSON.stringify(
                            barcodeDatabase
                        )
                    );

                    localStorage.setItem(
                        DATABASE_TIME_KEY,
                        Date.now().toString()
                    );

                } catch (error) {

                    console.log(
                        'Gagal menyimpan database lokal:',
                        error
                    );

                }


                console.log(
                    'Database berhasil dimuat:',
                    data.total,
                    'produk'
                );


                showDatabaseStatus(
                    'Database siap'
                );


            } else {

                console.error(
                    'Database gagal dimuat',
                    data
                );


                showDatabaseStatus(
                    'Database gagal dimuat'
                );

            }


            delete window[callbackName];


            if (script.parentNode) {

                script.parentNode.removeChild(
                    script
                );

            }

        };


    const script =
        document.createElement(
            'script'
        );


    script.src =
        API_URL +
        '?action=loadDatabase' +
        '&callback=' +
        encodeURIComponent(
            callbackName
        );


    script.onerror =
        function() {

            databaseLoading = false;


            console.error(
                'Gagal mengambil database'
            );


            showDatabaseStatus(
                'Gagal memuat database'
            );


            delete window[callbackName];


            if (script.parentNode) {

                script.parentNode.removeChild(
                    script
                );

            }

        };


    document.body.appendChild(
        script
    );

}


// ==================================================
// BUAT INDEX BARCODE
//
// Contoh:
//
// 0400308860007
//      ↓
// INDEX "040"
//
// 8994892000823
//      ↓
// INDEX "899"
// ==================================================

function buildBarcodeIndex() {

    barcodeIndex = {};


    for (
        let i = 0;
        i < barcodeDatabase.length;
        i++
    ) {

        const barcode =
            String(
                barcodeDatabase[i].barcode || ''
            ).trim();


        if (!barcode) {
            continue;
        }


        const prefix =
            barcode.substring(
                0,
                3
            );


        if (!barcodeIndex[prefix]) {

            barcodeIndex[prefix] = [];

        }


        barcodeIndex[prefix].push(
            barcodeDatabase[i]
        );

    }


    console.log(
        'Index barcode selesai'
    );

}


// ==================================================
// STATUS DATABASE
// ==================================================

function showDatabaseStatus(text) {

    let status =
        document.getElementById(
            'databaseStatus'
        );


    // Kalau elemen status belum ada,
    // tidak perlu membuat error
    if (!status) {
        return;
    }


    status.textContent =
        text;


    if (
        text === 'Database siap'
    ) {

        status.classList.add(
            'database-ready'
        );

    } else {

        status.classList.remove(
            'database-ready'
        );

    }

}


// ==================================================
// BUAT DROPDOWN
// ==================================================

function getSuggestionBox(nomor) {

    const input =
        document.getElementById(
            'barcode' + nomor
        );


    const barcodeArea =
        input.closest(
            '.barcode-area'
        );


    let dropdown =
        document.getElementById(
            'barcodeSuggestions' + nomor
        );


    if (!dropdown) {

        dropdown =
            document.createElement(
                'div'
            );


        dropdown.id =
            'barcodeSuggestions' + nomor;


        dropdown.className =
            'barcode-suggestions';


        barcodeArea.appendChild(
            dropdown
        );

    }


    return dropdown;

}


// ==================================================
// CARI BARCODE LOKAL
// ==================================================

function suggestBarcode(nomor) {

    const barcodeInput =
        document.getElementById(
            'barcode' + nomor
        );


    const nameElement =
        document.getElementById(
            'productName' + nomor
        );


    const dropdown =
        getSuggestionBox(nomor);


    const barcode =
        barcodeInput.value.trim();


    // ==================================================
    // KOSONG
    // ==================================================

    if (!barcode) {

        dropdown.innerHTML =
            '';

        dropdown.style.display =
            'none';

        return;

    }


    // ==================================================
    // MINIMAL 3 DIGIT
    // ==================================================

    if (barcode.length < 3) {

        dropdown.innerHTML =
            '';

        dropdown.style.display =
            'none';

        return;

    }


    // ==================================================
    // DATABASE BELUM SIAP
    // ==================================================

    if (!databaseReady) {

        dropdown.innerHTML =
            '<div class="barcode-suggestion-item">' +
            '⏳ Database sedang dimuat...' +
            '</div>';

        dropdown.style.display =
            'block';

        return;

    }


    // ==================================================
    // PILIH DATA BERDASARKAN 3 DIGIT AWAL
    // ==================================================

    const prefix =
        barcode.substring(
            0,
            3
        );


    const candidates =
        barcodeIndex[prefix] || [];


    const suggestions = [];


    // ==================================================
    // CARI
    // ==================================================

    for (
        let i = 0;
        i < candidates.length;
        i++
    ) {

        const item =
            candidates[i];


        const barcodeDB =
            String(
                item.barcode
            ).trim();


        let cocok = false;


        // ==================================================
        // 13 DIGIT ATAU LEBIH
        // EXACT MATCH
        // ==================================================

        if (
            barcode.length >= 13
        ) {

            cocok =
                barcodeDB === barcode;

        }


        // ==================================================
        // 3 - 12 DIGIT
        // PARTIAL MATCH
        // ==================================================

        else {

            cocok =
                barcodeDB.indexOf(
                    barcode
                ) !== -1;

        }


        if (cocok) {

            suggestions.push(
                item
            );

        }


        // Maksimal 10
        if (
            suggestions.length >= 10
        ) {

            break;

        }

    }


    // ==================================================
    // TAMPILKAN DROPDOWN
    // ==================================================

    dropdown.innerHTML =
        '';


    if (
        suggestions.length === 0
    ) {

        dropdown.style.display =
            'none';

        return;

    }


    suggestions.forEach(
        function(item) {

            const div =
                document.createElement(
                    'div'
                );


            div.className =
                'barcode-suggestion-item';


            div.innerHTML =

                '<div class="suggestion-barcode">' +
                item.barcode +
                '</div>' +

                '<div class="suggestion-name">' +
                item.prod_nm +
                '</div>';


            // ==================================================
            // PILIH SUGGESTION
            // ==================================================

            div.addEventListener(
                'mousedown',
                function(event) {

                    event.preventDefault();


                    barcodeInput.value =
                        item.barcode;


                    nameElement.textContent =
                        item.prod_nm;


                    dropdown.innerHTML =
                        '';

                    dropdown.style.display =
                        'none';

                }
            );


            dropdown.appendChild(
                div
            );

        }
    );


    dropdown.style.display =
        'block';

}


// ==================================================
// SAAT USER MENGETIK BARCODE
// ==================================================

document.addEventListener(
    'input',
    function(event) {

        const target =
            event.target;


        if (
            target.tagName === 'INPUT' &&
            /^barcode[1-7]$/.test(
                target.id
            )
        ) {

            const nomor =
                Number(
                    target.id.replace(
                        'barcode',
                        ''
                    )
                );


            suggestBarcode(
                nomor
            );

        }

    }
);


// ==================================================
// TUTUP DROPDOWN KLIK DI LUAR
// ==================================================

document.addEventListener(
    'click',
    function(event) {

        if (
            !event.target.closest(
                '.barcode-area'
            )
        ) {

            document
                .querySelectorAll(
                    '.barcode-suggestions'
                )
                .forEach(
                    function(dropdown) {

                        dropdown.style.display =
                            'none';

                    }
                );

        }

    }
);

// ==================================================
// ENTER PADA BARCODE
// ==================================================

document.addEventListener(
    'keydown',
    function(event) {

        if (event.key !== 'Enter') {
            return;
        }

        const target =
            event.target;

        if (
            target.tagName === 'INPUT' &&
            target.id.startsWith('barcode')
        ) {

            const nomor =
                target.id.replace(
                    'barcode',
                    ''
                );

            searchProduct(
                Number(nomor)
            );

        }

    }
);

// ==================================================
// SIMPAN SEMUA PRODUK
// Barcode & Expired wajib
// NIE boleh kosong
// ==================================================

function saveAllProducts() {

    const products = [];
    const errors = [];


    // ==================================================
    // CEK PRODUK 1 - 7
    // ==================================================

    for (
        let i = 1;
        i <= 7;
        i++
    ) {

        const barcode =
            document
                .getElementById(
                    'barcode' + i
                )
                .value
                .trim();

        const expired =
            document
                .getElementById(
                    'expired' + i
                )
                .value
                .trim();

        const izinEdar =
            document
                .getElementById(
                    'izin' + i
                )
                .value
                .trim();


        // ==================================================
        // PRODUK BENAR-BENAR KOSONG
        // ==================================================

        if (
            !barcode &&
            !expired &&
            !izinEdar
        ) {

            continue;

        }


        // ==================================================
        // BARCODE WAJIB
        // ==================================================

        if (!barcode) {

            errors.push(
                'Produk ' +
                i +
                ': Barcode belum diisi'
            );

        }


        // ==================================================
        // EXPIRED WAJIB
        // ==================================================

        if (!expired) {

            errors.push(
                'Produk ' +
                i +
                ': Expired wajib diisi'
            );

        }


        // ==================================================
        // JIKA BARCODE / EXPIRED KOSONG
        // JANGAN LANJUT KE VALIDASI TANGGAL
        // ==================================================

        if (
            !barcode ||
            !expired
        ) {

            continue;

        }


        // ==================================================
        // VALIDASI FORMAT EXPIRED
        // Harus 6 angka DDMMYY
        // ==================================================

        if (!/^\d{6}$/.test(expired)) {

            errors.push(
                'Produk ' +
                i +
                ': Expired harus format DDMMYY'
            );

            continue;

        }


        // ==================================================
        // VALIDASI TANGGAL
        // ==================================================

        const day =
            Number(
                expired.substring(0, 2)
            );

        const month =
            Number(
                expired.substring(2, 4)
            );

        const year =
            Number(
                expired.substring(4, 6)
            );

        const fullYear =
            2000 + year;


        const date =
            new Date(
                fullYear,
                month - 1,
                day
            );


        if (
            date.getFullYear() !== fullYear ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
        ) {

            errors.push(
                'Produk ' +
                i +
                ': Tanggal Expired tidak valid'
            );

            continue;

        }


        // ==================================================
        // PRODUK VALID
        // NIE BOLEH KOSONG
        // ==================================================

        products.push({

            barcode:
                barcode,

            expired:
                expired,

            izin_edar:
                izinEdar

        });

    }


    // ==================================================
    // ELEMENT PESAN & TOMBOL
    // ==================================================

    const message =
        document.getElementById(
            'message'
        );

    const saveButton =
        document.getElementById(
            'saveButton'
        );


    // ==================================================
    // JIKA ADA ERROR
    // JANGAN SIMPAN
    // ==================================================

    if (errors.length > 0) {

        message.className =
            'message error';

        message.textContent =
            errors.join(' | ');

        return;

    }


    // ==================================================
    // TIDAK ADA PRODUK
    // ==================================================

    if (products.length === 0) {

        message.className =
            'message error';

        message.textContent =
            'Tidak ada produk yang diisi';

        return;

    }


    // ==================================================
    // MULAI SIMPAN
    // ==================================================

    saveButton.disabled = true;

    saveButton.textContent =
        'MENYIMPAN...';

    message.className =
        'message';

    message.textContent =
        '';


    // ==================================================
    // CALLBACK UNIK
    // ==================================================

    const callbackName =
        'saveCallback_' +
        Date.now();


    // ==================================================
    // CALLBACK JSONP
    // ==================================================

    window[callbackName] = function(data) {

        if (data.success) {

            message.className =
                'message success';

            message.textContent =
                data.message;

            clearForm();

        } else {

            message.className =
                'message error';

            message.textContent =
                data.message;

        }


        delete window[callbackName];


        if (script.parentNode) {
            script.parentNode.removeChild(script);
        }


        saveButton.disabled = false;

        saveButton.textContent =
            'SIMPAN SEMUA';

    };


    // ==================================================
    // REQUEST JSONP
    // ==================================================

    const script =
        document.createElement('script');


    script.src =
        API_URL +
        '?action=save' +
        '&products=' +
        encodeURIComponent(
            JSON.stringify(products)
        ) +
        '&callback=' +
        encodeURIComponent(
            callbackName
        );


    // ==================================================
    // ERROR CONNECTION
    // ==================================================

    script.onerror = function() {

        console.error(
            'ERROR SAVE: Gagal terhubung ke server'
        );

        message.className =
            'message error';

        message.textContent =
            'Gagal terhubung ke server';


        delete window[callbackName];


        if (script.parentNode) {
            script.parentNode.removeChild(script);
        }


        saveButton.disabled = false;

        saveButton.textContent =
            'SIMPAN SEMUA';

    };


    // Jalankan request
    document.body.appendChild(script);

}

// ==================================================
// BERSIHKAN FORM
// ==================================================

function clearForm() {

    for (
        let i = 1;
        i <= 7;
        i++
    ) {

        document
            .getElementById(
                'barcode' + i
            )
            .value = '';

        document
            .getElementById(
                'expired' + i
            )
            .value = '';

        document
            .getElementById(
                'izin' + i
            )
            .value = '';

        document
            .getElementById(
                'productName' + i
            )
            .textContent = '';

    }

}
// ==================================================
// BARCODE SCANNER
// ==================================================

let activeScanner = null;
let activeScannerNumber = null;


// ==================================================
// BUKA / TUTUP SCANNER
// ==================================================

function toggleScanner(nomor) {

    // Jika scanner yang sama sedang aktif
    if (
        activeScanner &&
        activeScannerNumber === nomor
    ) {

        stopScanner(nomor);

        return;
    }


    // Jika scanner lain sedang aktif
    if (activeScanner) {

        stopScanner(
            activeScannerNumber
        );

    }


    startScanner(nomor);

}


// ==================================================
// MULAI SCANNER
// ==================================================

function startScanner(nomor) {

    const scannerElement =
        document.getElementById(
            'scanner' + nomor
        );

    const scanButton =
        document.getElementById(
            'scanButton' + nomor
        );


    // Bersihkan tampilan scanner
    scannerElement.innerHTML = '';

    scannerElement.style.display =
        'block';


    // Ubah tombol menjadi TUTUP
    scanButton.textContent =
        'TUTUP';


    // Buat scanner
    const scanner =
        new Html5Qrcode(
            'scanner' + nomor
        );


    activeScanner =
        scanner;

    activeScannerNumber =
        nomor;


    // ==================================================
    // KONFIGURASI SCANNER
    // ==================================================

    const config = {

        fps: 10,

        qrbox: {
            width: 250,
            height: 120
        },

        formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13
        ]

    };


    // ==================================================
    // BUKA KAMERA BELAKANG
    // ==================================================

    scanner.start(

        {
            facingMode: "environment"
        },

        config,

        function(decodedText) {

            // ==================================================
            // BARCODE BERHASIL DIBACA
            // ==================================================

            const barcodeInput =
                document.getElementById(
                    'barcode' + nomor
                );


            // Masukkan barcode
            barcodeInput.value =
                decodedText;


            // Bunyi beep
            beep();


            // ==================================================
            // TUTUP KAMERA TERLEBIH DAHULU
            // ==================================================

            stopScanner(nomor);


            // ==================================================
            // CARI PRODUK
            // ==================================================

            searchProduct(nomor);

        },

        function(errorMessage) {

            // Abaikan error scanning
            // karena ini normal selama kamera mencari barcode

        }

    )

    .catch(function(error) {

        console.error(
            'Scanner error:',
            error
        );


        alert(
            'Tidak dapat mengakses kamera belakang'
        );


        activeScanner = null;

        activeScannerNumber =
            null;


        scannerElement.innerHTML =
            '';

        scannerElement.style.display =
            'none';


        resetScannerButton(
            nomor
        );

    });

}


// ==================================================
// TUTUP SCANNER
// ==================================================

function stopScanner(nomor) {

    const scanner =
        activeScanner;


    const scannerElement =
        document.getElementById(
            'scanner' + nomor
        );


    // Jika scanner tidak aktif
    if (!scanner) {

        scannerElement.innerHTML =
            '';

        scannerElement.style.display =
            'none';


        resetScannerButton(
            nomor
        );

        return;

    }


    // ==================================================
    // STOP KAMERA
    // ==================================================

    scanner.stop()

        .then(function() {

            activeScanner =
                null;

            activeScannerNumber =
                null;


            scannerElement.innerHTML =
                '';

            scannerElement.style.display =
                'none';


            resetScannerButton(
                nomor
            );

        })

        .catch(function(error) {

            console.log(
                'Scanner stop:',
                error
            );


            // Tetap reset walaupun stop error

            activeScanner =
                null;

            activeScannerNumber =
                null;


            scannerElement.innerHTML =
                '';

            scannerElement.style.display =
                'none';


            resetScannerButton(
                nomor
            );

        });

}


// ==================================================
// RESET TOMBOL
// ==================================================

function resetScannerButton(nomor) {

    const scanButton =
        document.getElementById(
            'scanButton' + nomor
        );


    if (scanButton) {

        scanButton.textContent =
            'SCAN';

    }

}


// ==================================================
// BEEP
// ==================================================

function beep() {

    try {

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;


        const audioContext =
            new AudioContext();


        const oscillator =
            audioContext.createOscillator();


        const gainNode =
            audioContext.createGain();


        oscillator.connect(
            gainNode
        );


        gainNode.connect(
            audioContext.destination
        );


        // Frekuensi beep
        oscillator.frequency.value =
            1000;


        oscillator.type =
            'sine';


        // Volume
        gainNode.gain.setValueAtTime(
            0.3,
            audioContext.currentTime
        );


        // Mulai beep
        oscillator.start();


        // Durasi 0.15 detik
        oscillator.stop(
            audioContext.currentTime + 0.15
        );


    } catch (error) {

        console.log(
            'Beep tidak tersedia'
        );

    }

}
