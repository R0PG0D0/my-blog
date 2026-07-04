import HeroSection from "@/components/HeroSection";
import { getAllPostSummaries } from "@/lib/blog";

export default function Home() {
  return <HeroSection posts={getAllPostSummaries()} />;
}
