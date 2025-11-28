// pages/_app.js
import { AuthProvider } from '../contexts/AuthContext';
import '@fortawesome/fontawesome-free/css/all.css';
import '../app/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp;
