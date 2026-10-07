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
// AUTOCOMPLETE BARCODE
// Database tetap di Google Sheet
// Tidak download seluruh database
// Maksimal 10 saran
// ==================================================

let suggestTimer = null;
let suggestRequestId = 0;


// ==================================================
// GET SUGGESTION BOX
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
// Tanya langsung ke Apps Script
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


    // ==================================================
    // MINIMAL 3 DIGIT UNTUK AUTOCOMPLETE
    // ==================================================

    if (keyword.length < 3) {

        dropdown.innerHTML = '';

        dropdown.style.display =
            'none';

        return;

    }


    // ==================================================
    // TUNGGU 300ms
    // Supaya tidak request setiap ketikan
    // ==================================================

    clearTimeout(
        suggestTimer
    );


    const requestId =
        ++suggestRequestId;


    suggestTimer =
        setTimeout(
            function() {

                requestBarcodeSuggestions(
                    nomor,
                    keyword,
                    requestId
                );

            },
            300
        );

}


// ==================================================
// REQUEST SUGGESTION KE SERVER
// ==================================================

function requestBarcodeSuggestions(
    nomor,
    keyword,
    requestId
) {

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


    const callbackName =
        'suggestCallback_' +
        nomor +
        '_' +
        Date.now();


    const script =
        document.createElement(
            'script'
        );


    let finished = false;


    function finish() {

        if (finished) {
            return;
        }

        finished = true;

        delete window[callbackName];

        if (script.parentNode) {

            script.parentNode.removeChild(
                script
            );

        }

    }


    // ==================================================
    // CALLBACK JSONP
    // ==================================================

    window[callbackName] =
        function(data) {

            // Request lama diabaikan
            if (
                requestId !== suggestRequestId
            ) {

                finish();

                return;

            }


            // Input sudah berubah
            if (
                input.value.trim() !== keyword
            ) {

                finish();

                return;

            }


            dropdown.innerHTML = '';


            if (
                !data ||
                !data.success ||
                !Array.isArray(
                    data.suggestions
                )
            ) {

                dropdown.style.display =
                    'none';

                finish();

                return;

            }


            const suggestions =
                data.suggestions;


            // ==================================================
            // TIDAK ADA HASIL
            // ==================================================

            if (
                suggestions.length === 0
            ) {

                dropdown.style.display =
                    'none';

                finish();

                return;

            }


            // ==================================================
            // TAMPILKAN HASIL
            // ==================================================

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
                        (
                            item.prod_nm || ''
                        ) +
                        '</div>';


                    div.addEventListener(
                        'mousedown',
                        function(event) {

                            event.preventDefault();


                            input.value =
                                item.barcode;


                            nameElement.textContent =
                                item.prod_nm || '';


                            dropdown.innerHTML =
                                '';

                            dropdown.style.display =
                                'none';


                            // ==================================================
                            // SETELAH PILIH BARCODE
                            // TIDAK PERLU REQUEST SEARCH LAGI
                            // ==================================================

                        }
                    );


                    dropdown.appendChild(
                        div
                    );

                }
            );


            dropdown.style.display =
                'block';


            finish();

        };


    // ==================================================
    // ERROR
    // ==================================================

    script.onerror =
        function() {

            dropdown.innerHTML =
                '';

            dropdown.style.display =
                'none';

            finish();

        };


    // ==================================================
    // REQUEST KE APPS SCRIPT
    // ==================================================

    script.src =
        API_URL +
        '?action=suggest' +
        '&barcode=' +
        encodeURIComponent(
            keyword
        ) +
        '&callback=' +
        encodeURIComponent(
            callbackName
        );


    document.body.appendChild(
        script
    );

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
