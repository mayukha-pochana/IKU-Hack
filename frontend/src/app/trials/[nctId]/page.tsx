import TrialClient from "./TrialClient";

export default function TrialPage({ params }: { params: { nctId: string } }) {
  return <TrialClient nctId={params.nctId} />;
}

export async function generateStaticParams() {
  return [{ nctId: 'placeholder' }];
}