// ==================================================
// URL API GOOGLE APPS SCRIPT
// ==================================================

const API_URL =
    'https://script.google.com/macros/s/AKfycbypW6MFR6XiNHcca4X6RsNkkzk_2Gt1GQmEyQmu_VvtIGJ14X0SmemY_H3SI9X9GXPsJw/exec';


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
// ==================================================

async function saveAllProducts() {

    const products = [];


    for (
        let i = 1;
        i <= 7;
        i++
    ) {

        products.push({

            barcode:
                document
                    .getElementById(
                        'barcode' + i
                    )
                    .value
                    .trim(),

            expired:
                document
                    .getElementById(
                        'expired' + i
                    )
                    .value
                    .trim(),

            izin_edar:
                document
                    .getElementById(
                        'izin' + i
                    )
                    .value
                    .trim()

        });

    }


    const message =
        document.getElementById(
            'message'
        );

    const saveButton =
        document.getElementById(
            'saveButton'
        );


    saveButton.disabled = true;

    saveButton.textContent =
        'MENYIMPAN...';

    message.className =
        'message';

    message.textContent =
        '';


    try {

        const url =
            API_URL +
            '?action=save&products=' +
            encodeURIComponent(
                JSON.stringify(products)
            );


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                'HTTP ' +
                response.status
            );

        }


        const data =
            await response.json();


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


    } catch (error) {

        console.error(
            'ERROR SAVE:',
            error
        );

        message.className =
            'message error';

        message.textContent =
            'Gagal terhubung ke server';

    }


    saveButton.disabled = false;

    saveButton.textContent =
        'SIMPAN SEMUA';
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
