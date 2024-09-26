import React, { useState, useRef, useEffect } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import { Stage, Layer, Line } from 'react-konva';
import Konva from 'konva';
import { render } from 'react-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PDFDocument, rgb, AnnotationFlags } from 'pdf-lib';

const PDFViewer = ({pdfFile}) => {
	const [lines, setLines] = useState([]);
	const [isDrawing, setIsDrawing] = useState(false);
	const [showDrawings, setShowDrawings] = useState(true);
	const stageRef = useRef(null);
	const pdfRef = useRef(null);
	const [coordinates, setCoordinates] = useState({x1: '', y1: '', x2: '', y2: ''});
	// The output quality can be improved by increasing pageWidth and pageHeight
	const scale = 2;
	const pageWidth = 595; // 595
	const pageHeight = 842; // 842
	const imageWidth = scale * pageWidth;
	const imageHeight = scale * pageHeight;

	const handleMouseDown = (e) => {
		setIsDrawing(true);
		const pos = stageRef.current.getPointerPosition();
		setLines([...lines, { points: [pos.x, pos.y] }]);
	};

	const handleMouseMove = (e) => {
		if (!isDrawing) return;

		const stage = stageRef.current;
		const point = stage.getPointerPosition();
		let lastLine = lines[lines.length - 1];
		lastLine.points = lastLine.points.concat([point.x, point.y]);
		lines.splice(lines.length - 1, 1, lastLine);
		setLines([...lines]);
	};

	const handleMouseUp = (e) => {
		setIsDrawing(false);
	};

	const toggleDrawings = () => {
		setShowDrawings(!showDrawings);
	};

	const downloadPDF = async () => {
		const pdfPage = await html2canvas(pdfRef.current, {
			scale: 2,
		});
		const pdfPageDataURL = pdfPage.toDataURL("image/jpeg");
		const drawingsDataURL = stageRef.current.toDataURL({pixelRatio: 2});
		const pdf = new jsPDF("portrait", "pt", "a4");
		pdf.addImage(pdfPageDataURL, "JPEG", 0, 0, pageWidth, pageHeight); // width, height
		/*pdf.addImage(drawingsDataURL, "PNG", 0, 0, 2752, 1677);*/
		pdf.save("annotated_sample.pdf");
	};

	const downloadPDFWithAnnotations = async () => {
		const existingPdfBytes = await fetch(pdfFile).then(res => res.arrayBuffer());
		const pdfDoc = await PDFDocument.load(existingPdfBytes);
		const page = pdfDoc.getPage(0);
		lines.forEach(line => {
			const points = line.points;
			for (let i = 0; i < points.length - 2; i += 2) {
				const x1 = points[i];
				const y1 = points[i+1];
				const x2 = points[i+2];
				const y2 = points[i+3];

				/*
				const annotation = {
					Type: 'Annot',
					Subtype: 'Line',
					Rect: [
						Math.min(x1, x2), page.getHeight() - Math.max(y1, y2),
						Math.max(x1, x2), page.getHeight() - Math.min(y1, y2),
					],
					Contents: 'Freehand drawing',
					C: [0, 0, 1],
					Border: [0, 0, 2],
					Flags: AnnotationFlags.Print,
					L: [x1, page.getHeight()-y1, x2, page.getHeight()-y2],
				};

				page.node.set('Annots', pdfDoc.context.obj([pdfDoc.context.obj(annotation)]));
				*/
				/*
				// create a line annotation
				const lineAnnotation = {
					rect: {
						x: Math.min(x1, x2),
						y: page.getHeight() - Math.max(y1, y2),
						width: Math.abs(x2 - x1),
						height: Math.abs(y2 - y1),
					},
					color: rgb(0, 0, 1),
					contents: 'Freehand drawing',
				};

				page.drawSvgPath(`M${x1},${page.getHeight()-y1} L${x2},${page.getHeight()-y2}`, {
					color: rgb(0, 0, 1),
					thickness: 2,
				});
				
				page.addAnnotation({
					type: 'Line',
					...lineAnnotation,
				});
				*/
				
				page.drawLine({
					start: { x: x1, y: page.getHeight() - y1 },
					end: { x: x2, y: page.getHeight() - y2 },
					color: rgb(0,0,1),
					thickness: 2,
				});
				
			}
		});
		const pdfBytes = await pdfDoc.save();

		const blob = new Blob([pdfBytes], {type: 'application/pdf'});
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = 'annotated.pdf';
		link.click();
	};
	
	const handleDrawLine = () => {
		const {x1,y1,x2,y2} = coordinates;
		const parsedX1 = parseFloat(x1);
		const parsedY1 = parseFloat(y1);
		const parsedX2 = parseFloat(x2);
		const parsedY2 = parseFloat(y2);
		
		const newLine = {points: [parsedX1, parsedY1, parsedX2, parsedY2]};
		setLines([...lines, newLine]);
		resetCoordinates();
	};
	
	const handleChange = (e) => {
		setCoordinates({...coordinates, [e.target.name]: e.target.value});
	};
	
	const resetCoordinates = () => {
		setCoordinates({x1: '', y1: '', x2: '', y2: ''});
	};

	useEffect(() => {
		const stage = stageRef.current;
		stage.width(pageWidth);
		stage.height(pageHeight);
	});

	pdfjs.GlobalWorkerOptions.workerSrc = new URL(
		'pdfjs-dist/build/pdf.worker.min.mjs',
		import.meta.url,
	).toString();
	
	return (
		<div>
			<h2>PDF Viewer with freehand drawing</h2>

			<button onClick={downloadPDF}>Download PDF with annotations as image</button>

			<button onClick={downloadPDFWithAnnotations}>Download PDF with annotations</button>
	        
	        <button onClick={toggleDrawings}>
	        	{showDrawings ? 'Hide annotations': 'Show annotations'}
	        </button>
			
			<div style={{ position: 'relative', width: `${pageWidth}px`, height: `${pageHeight}px` }} ref={pdfRef}>
				<Document file={pdfFile}>
					<Page pageNumber={1} renderTextLayer={false} width={pageWidth} height={pageHeight}  />
				</Document>
				
				<div style={{ position: 'absolute', top: 0, left: 0 }}>
					<Stage ref={stageRef} width={pageWidth} height={pageHeight} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
						<Layer visible={showDrawings}>
							{lines.map((line, index) => (
								<Line
									key={index}
									points={line.points}
									stroke="blue"
									strokeWidth={2}
									tension={0.5}
									lineCap="round"
									globalCompositeOperation="source-over"
								/>
							))}
						</Layer>
					</Stage>
				</div>
			</div>
		</div>
	);
};

export default PDFViewer;