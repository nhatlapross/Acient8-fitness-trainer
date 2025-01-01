import Layout from '../components/Layout/layout';
import 'tailwindcss/tailwind.css';
import { config } from '@/config'
import Web3ModalProvider from '@/context'

export default function MyApp({ Component, pageProps }) {
  return (
    <Web3ModalProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </Web3ModalProvider>
  )
}