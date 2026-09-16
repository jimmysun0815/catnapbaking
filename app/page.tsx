import { redirect } from "next/navigation";

export default function Root() {
  // 主要客群是华人，默认中文
  redirect("/zh");
}
