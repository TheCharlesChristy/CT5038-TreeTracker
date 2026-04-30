import Head from 'expo-router/head';
import { Asset } from 'expo-asset';

const logoUri = Asset.fromModule(require('@/assets/images/logo.png')).uri;

export function FaviconHead() {
  return (
    <Head>
      <link rel="icon" type="image/png" href={logoUri} />
    </Head>
  );
}
