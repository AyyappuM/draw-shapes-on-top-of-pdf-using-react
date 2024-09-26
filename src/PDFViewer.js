import React, { useState, useRef } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import { Stage, Layer, Line } from 'react-konva';
import Konva from 'konva';
import { render } from 'react-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const PDFViewer = ({pdfFile}) => {
	const [lines, setLines] = useState([]);
	const [isDrawing, setIsDrawing] = useState(false);
	const [showDrawings, setShowDrawings] = useState(true);
	const stageRef = useRef(null);
	const pdfRef = useRef(null);
	const [coordinates, setCoordinates] = useState({x1: '', y1: '', x2: '', y2: ''});

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
		pdf.addImage(pdfPageDataURL, "JPEG", 0, 0, 2687, 1685);
		/*pdf.addImage(drawingsDataURL, "PNG", 0, 0, 2752, 1677);*/
		pdf.save("annotated_sample.pdf");
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

	pdfjs.GlobalWorkerOptions.workerSrc = new URL(
		'pdfjs-dist/build/pdf.worker.min.mjs',
		import.meta.url,
	).toString();
	
	return (
		<div>
			<h2>PDF Viewer with freehand drawing</h2>

			<button onClick={downloadPDF}>Download PDF with annotations</button>
	        
	        <button onClick={toggleDrawings}>
	        	{showDrawings ? 'Hide annotations': 'Show annotations'}
	        </button>
			
			<div style={{ position: 'relative' }} ref={pdfRef}>
				<Document file={pdfFile}>
					<Page pageNumber={1} renderTextLayer={false} width={595} height={841}  />
				</Document>
				
				<div style={{ position: 'absolute', top: 0, left: 0 }}>
					<Stage ref={stageRef} width={595} height={841} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
						<Layer visible={showDrawings}>
							{lines.map((line, index) => (
								<Line
									key={index}
									points={line.points}
									stroke="green"
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