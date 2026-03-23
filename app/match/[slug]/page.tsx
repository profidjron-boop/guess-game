import MatchDetailsScreen from "@/components/MatchDetailsScreen";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function MatchRoutePage({ params }: Props) {
  const { slug } = await params;
  return <MatchDetailsScreen slug={slug} />;
}
