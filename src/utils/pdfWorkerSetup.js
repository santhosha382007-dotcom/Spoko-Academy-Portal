import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined') {
    try {
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl || './pdf.worker.min.mjs';
    } catch (e) {
        pdfjs.GlobalWorkerOptions.workerSrc = './pdf.worker.min.mjs';
    }
}

export { pdfjs };
