import Head from 'expo-router/head';

type Props = {
  title: string;
};

export function FaviconHead({ title }: Props) {
  return (
    <Head>
      <title>{title}</title>
    </Head>
  );
}
