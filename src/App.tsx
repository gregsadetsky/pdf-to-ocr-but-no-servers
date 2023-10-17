import { useState, useEffect, useRef } from "react";
import "./App.css";
import { OCRClient } from "tesseract-wasm";

const pdfjsLib = window.pdfjsLib;

function asyncFileReader(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(arrayBuffer);
      resolve(bytes);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function App() {
  const [uploadedFile, setUploadedFile] = useState<File | undefined>(undefined);
  const ocr = useRef<OCRClient | undefined>(undefined);
  const [ocrReady, setOcrReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasStartedDoingOcr, setHasStartedDoingOcr] = useState(false);
  const [processingPageIndex, setProcessingPageIndex] = useState(0);
  const [processingPageCount, setProcessingPageCount] = useState(0);
  const [ocrTextResult, setOcrTextResult] = useState<string>("");
  const [copyToClipboardButtonName, setCopyToClipboardButtonName] =
    useState("Copy to Clipboard");

  useEffect(() => {
    ocr.current = new OCRClient();

    // Load the appropriate OCR training data for the image(s) we want to
    // process.
    ocr.current.loadModel("eng.traineddata").then(() => {
      setOcrReady(true);
    });
  }, []);

  async function processPageGetText(pdf, pageIndex: number) {
    return new Promise((resolve, reject) => {
      pdf.getPage(pageIndex).then((page) => {
        const scale = 1.5;
        const viewport = page.getViewport({ scale: scale });
        // Support HiDPI-screens.
        const outputScale = window.devicePixelRatio || 1;

        const canvas = document.createElement("canvas");
        if (!canvas) return;
        const context = (canvas as HTMLCanvasElement).getContext("2d");
        if (!context) return;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height = Math.floor(viewport.height) + "px";

        const transform =
          outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        const renderContext = {
          canvasContext: context,
          transform: transform,
          viewport: viewport,
        };
        const renderTask = page.render(renderContext);
        renderTask.promise.then(function () {
          const myImageData = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          );

          ocr.current.loadImage(myImageData).then(() => {
            // Perform text recognition and return text in reading order.
            ocr.current.getText().then((text: string) => {
              resolve(text);
            });
          });
        });
      });
    });
  }

  useEffect(() => {
    if (!uploadedFile) {
      return;
    }
    if (!ocrReady) {
      return;
    }

    setIsProcessing(true);
    setHasStartedDoingOcr(true);

    async function asyncFunction() {
      const typedarray = await asyncFileReader(uploadedFile as File);

      //Step 5:pdfjs should be able to read this
      const loadingTask = pdfjsLib.getDocument(typedarray);
      const pdf = await loadingTask.promise;

      setProcessingPageCount(pdf.numPages);

      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        setProcessingPageIndex(i);
        text += await processPageGetText(pdf, i);
      }

      setOcrTextResult(text);
      setIsProcessing(false);
      ocr.current.destroy();
    }

    asyncFunction();
  }, [uploadedFile, ocrReady]);

  return (
    <>
      <h1>Convert your PDF File to Text With No Servers</h1>
      <h2>what is this</h2>

      <p>
        this is a completely free tool that lets you convert your PDF file to
        text (using OCR) which does not collect any of your data.
      </p>
      <p>
        your PDFs NEVER leave your browser. there is no server!!! don't upload
        your PDFs to random servers!!
      </p>
      <p>
        this was made by{" "}
        <a href="https://greg.technology/" target="_blank">
          greg
        </a>{" "}
        while at{" "}
        <a href="https://www.recurse.com/" target="_blank">
          recurse center
        </a>
        . i've made{" "}
        <a href="https://recurse.greg.technology/" target="_blank">
          other things
        </a>
        . view the{" "}
        <a
          href="https://github.com/gregsadetsky/pdf-to-ocr-but-no-servers"
          target="_blank"
        >
          source code
        </a>
        .
      </p>

      <hr style={{ marginTop: "20px" }} />

      {!hasStartedDoingOcr && (
        <input
          type="file"
          onChange={(e) => {
            setUploadedFile(e.target.files?.[0]);
          }}
          accept="application/pdf"
          disabled={!ocrReady}
          style={{ marginTop: "20px" }}
        />
      )}
      <div>
        {isProcessing && (
          <>
            <div style={{ marginTop: "10px" }}>Processing...</div>
            <progress
              max={processingPageCount}
              value={processingPageIndex}
            ></progress>
          </>
        )}
      </div>
      {ocrTextResult && (
        <>
          <button
            onClick={() => {
              navigator.clipboard.writeText(ocrTextResult);
              setCopyToClipboardButtonName("Copied!");
              setTimeout(() => {
                setCopyToClipboardButtonName("Copy to Clipboard!");
              }, 1500);
            }}
            style={{
              marginTop: "30px",
              marginBottom: "10px",
              padding: "10px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
              color: "blue",
            }}
          >
            {copyToClipboardButtonName}
          </button>
          <textarea
            value={ocrTextResult}
            style={{ marginTop: "20px", width: "800px", height: "400px" }}
            readOnly
          />
        </>
      )}
    </>
  );
}

export default App;
