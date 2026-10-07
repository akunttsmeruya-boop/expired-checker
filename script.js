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
// DATABASE BARCODE - INDEXEDDB CACHE
// CACHE 24 JAM + BACKGROUND UPDATE
// ==================================================

const DB_NAME = 'CEK_PRODUK_EXPIRED_DB';
const DB_VERSION = 1;
const DB_STORE = 'database';

const CACHE_KEY = 'barcodeDatabase';
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 jam

let barcodeDatabase = [];
let barcodeMap = {};
let databaseReady = false;
let databaseLoading = false;


// ==================================================
// BUKA INDEXEDDB
// ==================================================

function openBarcodeDB() {

    return new Promise(function(resolve, reject) {

        const request = indexedDB.open(
            DB_NAME,
            DB_VERSION
        );

        request.onupgradeneeded = function(event) {

            const db = event.target.result;

            if (!db.objectStoreNames.contains(DB_STORE)) {

                db.createObjectStore(
                    DB_STORE
                );

            }

        };

        request.onsuccess = function(event) {

            resolve(
                event.target.result
            );

        };

        request.onerror = function() {

            reject(
                request.error
            );

        };

    });

}


// ==================================================
// SIMPAN DATABASE KE INDEXEDDB
// ==================================================

async function saveDatabaseToCache(data) {

    try {

        const db =
            await openBarcodeDB();

        return new Promise(function(resolve, reject) {

            const transaction =
                db.transaction(
                    DB_STORE,
                    'readwrite'
                );

            const store =
                transaction.objectStore(
                    DB_STORE
                );

            store.put(
                {
                    data: data,
                    time: Date.now()
                },
                CACHE_KEY
            );

            transaction.oncomplete =
                function() {

                    resolve(true);

                };

            transaction.onerror =
                function() {

                    reject(
                        transaction.error
                    );

                };

        });

    } catch (error) {

        console.error(
            'Gagal menyimpan cache:',
            error
        );

        return false;

    }

}


// ==================================================
// BACA DATABASE DARI INDEXEDDB
// ==================================================

async function getDatabaseFromCache() {

    try {

        const db =
            await openBarcodeDB();

        return new Promise(function(resolve, reject) {

            const transaction =
                db.transaction(
                    DB_STORE,
                    'readonly'
                );

            const store =
                transaction.objectStore(
                    DB_STORE
                );

            const request =
                store.get(
                    CACHE_KEY
                );

            request.onsuccess =
                function() {

                    resolve(
                        request.result || null
                    );

                };

            request.onerror =
                function() {

                    reject(
                        request.error
                    );

                };

        });

    } catch (error) {

        console.error(
            'Gagal membaca cache:',
            error
        );

        return null;

    }

}


// ==================================================
// BUAT INDEX BARCODE
// ==================================================

function buildBarcodeIndex() {

    barcodeMap = {};

    for (
        let i = 0;
        i < barcodeDatabase.length;
        i++
    ) {

        const item =
            barcodeDatabase[i];

        const barcode =
            String(
                item.barcode || ''
            ).trim();

        if (!barcode) {
            continue;
        }

        barcodeMap[barcode] =
            item;

    }

    console.log(
        'Index barcode:',
        Object.keys(barcodeMap).length
    );

}


// ==================================================
// AKTIFKAN DATABASE
// ==================================================

function activateDatabase(data) {

    if (
        !Array.isArray(data)
    ) {

        return false;

    }

    barcodeDatabase =
        data;

    buildBarcodeIndex();

    databaseReady = true;

    return true;

}


// ==================================================
// LOAD DATABASE SAAT WEBSITE DIBUKA
// ==================================================

document.addEventListener(
    'DOMContentLoaded',
    async function() {

        await initializeBarcodeDatabase();

    }
);


// ==================================================
// INITIALIZE DATABASE
// ==================================================

async function initializeBarcodeDatabase() {

    const cache =
        await getDatabaseFromCache();

    // ==============================================
    // ADA CACHE
    // ==============================================

    if (
        cache &&
        Array.isArray(cache.data) &&
        cache.data.length > 0
    ) {

        console.log(
            'Cache ditemukan:',
            cache.data.length,
            'produk'
        );

        activateDatabase(
            cache.data
        );

        // Jangan tunggu server
        hideDatabaseLoading();

        // ==========================================
        // CEK UMUR CACHE
        // ==========================================

        const cacheAge =
            Date.now() -
            Number(cache.time || 0);

        if (
            cacheAge >= CACHE_MAX_AGE
        ) {

            console.log(
                'Cache lebih dari 24 jam.'
            );

            loadDatabaseFromServer(
                true
            );

        } else {

            console.log(
                'Cache masih valid.'
            );

            // Tidak perlu download
            // setiap buka website.

        }

        return;

    }


    // ==============================================
    // BELUM ADA CACHE
    // ==============================================

    console.log(
        'Belum ada cache.'
    );

    showDatabaseLoading();

    await loadDatabaseFromServer(
        false
    );

}


// ==================================================
// LOAD DATABASE DARI SERVER
// ==================================================

function loadDatabaseFromServer(background) {

    return new Promise(function(resolve) {

        if (databaseLoading) {

            resolve(false);

            return;

        }

        databaseLoading = true;

        if (!background) {

            showDatabaseLoading();

        }

        const callbackName =
            'databaseCallback_' +
            Date.now();

        const script =
            document.createElement(
                'script'
            );

        let finished = false;


        function finish(success) {

            if (finished) {
                return;
            }

            finished = true;

            databaseLoading = false;

            delete window[callbackName];

            if (
                script.parentNode
            ) {

                script.parentNode.removeChild(
                    script
                );

            }

            resolve(success);

        }


        window[callbackName] =
            async function(data) {

                if (
                    data &&
                    data.success &&
                    Array.isArray(data.data)
                ) {

                    console.log(
                        'Database server:',
                        data.data.length,
                        'produk'
                    );

                    activateDatabase(
                        data.data
                    );

                    await saveDatabaseToCache(
                        data.data
                    );

                    console.log(
                        'Database berhasil disimpan ke cache.'
                    );

                    if (!background) {

                        hideDatabaseLoading();

                    }

                    finish(true);

                } else {

                    console.error(
                        'Database gagal:',
                        data
                    );

                    if (!background) {

                        showDatabaseError();

                    }

                    finish(false);

                }

            };


        script.onerror =
            function() {

                console.error(
                    'Gagal mengambil database server.'
                );

                if (!background) {

                    showDatabaseError();

                }

                finish(false);

            };


        script.src =
            API_URL +
            '?action=loadDatabase' +
            '&callback=' +
            encodeURIComponent(
                callbackName
            );

        document.body.appendChild(
            script
        );

    });

}


// ==================================================
// LOADING
// ==================================================

function showDatabaseLoading() {

    const loading =
        document.getElementById(
            'databaseLoading'
        );

    if (!loading) {
        return;
    }

    loading.style.display =
        'flex';

}


// ==================================================
// SEMBUNYIKAN LOADING
// ==================================================

function hideDatabaseLoading() {

    const loading =
        document.getElementById(
            'databaseLoading'
        );

    if (!loading) {
        return;
    }

    loading.style.display =
        'none';

}


// ==================================================
// DATABASE ERROR
// ==================================================

function showDatabaseError() {

    const loading =
        document.getElementById(
            'databaseLoading'
        );

    if (!loading) {
        return;
    }

    loading.innerHTML =

        '<div class="database-loading-box">' +

        '<div style="font-size:45px;">⚠️</div>' +

        '<div style="margin-top:10px;">' +

        'Database gagal dimuat' +

        '</div>' +

        '<button ' +

        'onclick="location.reload()" ' +

        'style="' +

        'margin-top:20px;' +
        'padding:10px 20px;' +
        'border:0;' +
        'border-radius:6px;' +
        'background:#1976D2;' +
        'color:white;' +
        'font-weight:bold;' +
        'cursor:pointer;' +

        '">' +

        'COBA LAGI' +

        '</button>' +

        '</div>';

    loading.style.display =
        'flex';

}


// ==================================================
// CARI BARCODE SECARA LOKAL
// ==================================================

function findProductLocal(barcode) {

    barcode =
        String(
            barcode || ''
        ).trim();

    if (!barcode) {
        return null;
    }

    return barcodeMap[barcode] || null;

}


// ==================================================
// AUTOCOMPLETE BARCODE
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
// SUGGEST BARCODE
// ==================================================

function suggestBarcode(nomor) {

    const input =
        document.getElementById(
            'barcode' + nomor
        );

    const nameElement =
        document.getElementById(
            'productName' + nomor
        );

    const dropdown =
        getSuggestionBox(nomor);

    const keyword =
        input.value.trim();

    if (!keyword) {

        dropdown.innerHTML = '';

        dropdown.style.display =
            'none';

        nameElement.textContent =
            '';

        return;

    }

    if (!databaseReady) {

        return;

    }

    // ==============================================
    // BARCODE EXACT
    // ==============================================

    const exact =
        findProductLocal(
            keyword
        );

    if (exact) {

        nameElement.textContent =
            exact.prod_nm || '';

        dropdown.innerHTML = '';

        dropdown.style.display =
            'none';

        return;

    }


    // ==============================================
    // AUTOCOMPLETE
    // HANYA DARI AWAL BARCODE
    // ==============================================

    if (
        keyword.length < 3
    ) {

        dropdown.innerHTML = '';

        dropdown.style.display =
            'none';

        return;

    }

    const suggestions = [];

    for (
        let i = 0;
        i < barcodeDatabase.length;
        i++
    ) {

        const item =
            barcodeDatabase[i];

        const barcode =
            String(
                item.barcode || ''
            );

        if (
            barcode.startsWith(
                keyword
            )
        ) {

            suggestions.push(
                item
            );

        }

        if (
            suggestions.length >= 10
        ) {

            break;

        }

    }


    dropdown.innerHTML = '';


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


            div.addEventListener(
                'mousedown',
                function(event) {

                    event.preventDefault();

                    input.value =
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
// EVENT INPUT BARCODE
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
// TUTUP DROPDOWN
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
