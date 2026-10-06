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
