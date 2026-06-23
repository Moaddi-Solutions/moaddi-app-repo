"use server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import walk from "walk";

let walker;
const options = {};
const root = "./data";
export const list = async function () {
  const { promise, resolve, reject } = Promise.withResolvers();
  const result = [];
  walker = walk.walk(root, options);
  walker.on("file", function (parent, fileStats, next) {
    result.push(`${parent.slice(root.length + 1)}/${fileStats.name}`);
    next();
  });
  walker.on("end", function () {
    resolve(result);
  });
  return promise;
};

export const get = async function (fileName) {
  const file = await readFile(`${root}/${fileName}`);
  return JSON.parse(file.toString());
};

export const set = async function (fileName, content) {
  return await writeFile(`${root}/${fileName}`, JSON.stringify(content.json));
};
