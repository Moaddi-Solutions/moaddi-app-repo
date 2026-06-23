"use client";
import { get, list, set } from "@/(dev)/json/actions/data";
import { Button } from "@/../components/ui/button";
import { Container } from "@/../components/ui/container";
import { useEffect, useState } from "react";
import { type Content } from "vanilla-jsoneditor";
import "vanilla-jsoneditor/themes/jse-theme-dark.css";
import "./App.css";
import VanillaJSONEditor from "./VanillaJSONEditor";

function App() {
  const [content, setContent] = useState<Content>({ json: {} });
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState("");
  useEffect(() => {
    list().then(setFiles);
  }, []);

  return (
    <Container>
      <div className="App jse-theme-dark">
        <ul className="flex flex-col gap-1">
          {files.map((file) => (
            <li
              className={`${selected == file ? "text-sky-500" : ""} cursor-pointer`}
              onClick={() => {
                setSelected(file);
                get(file).then((json) => setContent({ json }));
              }}
              key={file}
            >
              {file}
            </li>
          ))}
        </ul>
        <VanillaJSONEditor content={content} onChange={setContent} />
        <Button
          className="mt-2 size-4 cursor-pointer rounded-none bg-sky-600 px-6 py-3"
          onClick={() => {
            set(selected, content);
          }}
        >
          Save
        </Button>
        {/* <h2>Contents</h2>
      <pre className="my-contents">
      <code>{JSON.stringify(content, null, 2)}</code>
      </pre> */}
      </div>
    </Container>
  );
}

export default App;
