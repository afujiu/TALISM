<script>
	import html2canvas from 'html2canvas';
	import { jsPDF } from 'jspdf';

	let pdfTarget;

	/**
	 * PDF化
	 */
	async function createPdf() {
		const pages = pdfTarget.querySelectorAll('.pdf-page');

		const pdf = new jsPDF('p', 'mm', 'a4');

		for (let i = 0; i < pages.length; i++) {
			const canvas = await html2canvas(pages[i], {
				scale: 2,
				useCORS: true
			});

			const imgData = canvas.toDataURL('image/png');
			const pdfWidth = 210;
			const pdfHeight = 297;

			// A4いっぱいに表示
			const imgWidth = pdfWidth;
			const imgHeight =
				canvas.height * imgWidth / canvas.width;

			// 2ページ目以降は新しいページを追加
			if (i > 0) {
				pdf.addPage();
			}

			pdf.addImage(
				imgData,
				'PNG',
				0,
				0,
				imgWidth,
				Math.min(imgHeight, pdfHeight)
			);
		}

		pdf.save('barcode.pdf');
	}
</script>

<button onclick={createPdf}>
	PDF化
</button>

<div bind:this={pdfTarget}>
	<slot></slot>
</div>