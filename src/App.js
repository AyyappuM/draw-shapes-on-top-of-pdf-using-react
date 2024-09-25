import React from 'react';
import PDFViewer from './PDFViewer';
import samplePdf from './sample.pdf';
import './App.css';
import { pdfjs, Document, Page } from 'react-pdf';

const App = () => {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  
  return (
    <div>
      <h1>Simple PDF Viewer with line drawing</h1>
      <PDFViewer pdfFile={samplePdf} />
      
    </div>
  )
}

export default App;
