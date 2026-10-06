const API_URL = 'https://script.google.com/macros/s/AKfycbylGdvfr812eNhNlBQJMxuX-iwgAf33NTIvGQbArD8csrcxRVC_fgH8ossTl-WWn5IF6g/exec';


// =====================================================
// SEARCH PRODUCT
// =====================================================

async function searchProduct(nomor) {

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

    try {

        const url =
            API_URL +
            '?action=search&barcode=' +
            encodeURIComponent(barcode);

        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(
                'HTTP ' + response.status
            );
        }

        const data = await response.json();

        console.log('HASIL API:', data);

        if (data.success && data.found) {

            barcodeInput.value =
                data.barcode;

            nameElement.textContent =
                data.prod_nm;

        } else {

            nameElement.textContent =
                'BARCODE TIDAK DITEMUKAN';

        }

    } catch (error) {

        console.error(
            'ERROR SEARCH:',
            error
        );

        nameElement.textContent =
            'Gagal terhubung ke server';
    }
}


// =====================================================
// ENTER PADA BARCODE
// =====================================================

document.addEventListener('keydown', function(event) {

    if (event.key !== 'Enter') {
        return;
    }

    const target = event.target;

    if (
        target.tagName === 'INPUT' &&
        target.id.startsWith('barcode')
    ) {

        event.preventDefault();

        const nomor =
            Number(target.id.replace('barcode', ''));

        searchProduct(nomor);

    }

});


// =====================================================
// FILTER BARCODE DAN EXPIRED
// =====================================================

document.addEventListener('input', function(event) {

    const target = event.target;

    // Barcode hanya angka
    if (target.id.startsWith('barcode')) {

        target.value = target.value.replace(/\D/g, '');

    }

    // Expired hanya angka dan maksimal 6 digit
    if (target.id.startsWith('expired')) {

        target.value = target.value
            .replace(/\D/g, '')
            .substring(0, 6);

    }

});


// =====================================================
// VALIDASI EXPIRED DDMMYY
// =====================================================

function validateExpired(value) {

    if (!/^\d{6}$/.test(value)) {
        return false;
    }

    const day = Number(value.substring(0, 2));
    const month = Number(value.substring(2, 4));
    const year = Number(value.substring(4, 6));

    if (month < 1 || month > 12) {
        return false;
    }

    // Tahun 20xx
    const fullYear = 2000 + year;

    const date = new Date(
        fullYear,
        month - 1,
        day
    );

    if (
        date.getFullYear() !== fullYear ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return false;
    }

    return true;
}


// =====================================================
// SIMPAN SEMUA PRODUK
// =====================================================

async function saveAllProducts() {

    const products = [];
    const errors = [];

    for (let i = 1; i <= 7; i++) {

        const barcode =
            document.getElementById('barcode' + i).value.trim();

        const expired =
            document.getElementById('expired' + i).value.trim();

        const izinEdar =
            document.getElementById('izin' + i).value.trim();


        // ---------------------------------------------
        // PRODUK KOSONG
        // ---------------------------------------------

        if (!barcode && !expired && !izinEdar) {
            continue;
        }


        // ---------------------------------------------
        // VALIDASI BARCODE
        // ---------------------------------------------

        if (!barcode) {

            errors.push(
                'Produk ' + i + ': Barcode belum diisi'
            );

            continue;
        }


        // ---------------------------------------------
        // VALIDASI EXPIRED
        // ---------------------------------------------

        if (!expired) {

            errors.push(
                'Produk ' + i + ': Expired belum diisi'
            );

            continue;
        }

        if (!/^\d{6}$/.test(expired)) {

            errors.push(
                'Produk ' + i + ': Expired harus 6 angka (DDMMYY)'
            );

            continue;
        }

        if (!validateExpired(expired)) {

            errors.push(
                'Produk ' + i + ': Tanggal expired tidak valid'
            );

            continue;
        }


        // ---------------------------------------------
        // VALIDASI NIE
        // ---------------------------------------------

        if (!izinEdar) {

            errors.push(
                'Produk ' + i + ': Nomor Izin Edar belum diisi'
            );

            continue;
        }


        // ---------------------------------------------
        // PRODUK VALID
        // ---------------------------------------------

        products.push({

            barcode: barcode,

            expired: expired,

            izin_edar: izinEdar

        });

    }


    const message =
        document.getElementById('message');

    const saveButton =
        document.getElementById('saveButton');


    // =================================================
    // JIKA ADA ERROR
    // =================================================

    if (errors.length > 0) {

        message.className = 'message error';

        message.textContent =
            errors.join('\n');

        return;
    }


    // =================================================
    // TIDAK ADA PRODUK
    // =================================================

    if (products.length === 0) {

        message.className = 'message error';

        message.textContent =
            'Belum ada produk yang diisi.';

        return;
    }


    // =================================================
    // MULAI SIMPAN
    // =================================================

    saveButton.disabled = true;

    saveButton.textContent = 'MENYIMPAN...';

    message.className = 'message';

    message.textContent = '';


    try {

        const url =
            API_URL +
            '?action=save&products=' +
            encodeURIComponent(
                JSON.stringify(products)
            );


        const response =
            await fetch(url);


        const data =
            await response.json();


        // =================================================
        // BERHASIL
        // =================================================

        if (data.success) {

            message.className =
                'message success';

            message.textContent =
                data.message ||
                products.length +
                ' produk berhasil disimpan.';

            clearForm();

        }

        // =================================================
        // GAGAL
        // =================================================

        else {

            message.className =
                'message error';

            message.textContent =
                data.message ||
                'Data gagal disimpan.';

        }

    }

    catch (error) {

        console.error(error);

        message.className =
            'message error';

        message.textContent =
            'Gagal terhubung ke server.';

    }


    // =================================================
    // KEMBALIKAN TOMBOL
    // =================================================

    saveButton.disabled = false;

    saveButton.textContent =
        'SIMPAN SEMUA';

}


// =====================================================
// CLEAR FORM
// =====================================================

function clearForm() {

    for (let i = 1; i <= 7; i++) {

        document.getElementById(
            'barcode' + i
        ).value = '';

        document.getElementById(
            'expired' + i
        ).value = '';

        document.getElementById(
            'izin' + i
        ).value = '';

        document.getElementById(
            'productName' + i
        ).textContent = '';

    }

}
