"use server";
import { revalidateTag } from "next/cache";

const revalidateContent = async () => {
  // console.log("revalidated");
  revalidateTag("content");
};
export default revalidateContent;
