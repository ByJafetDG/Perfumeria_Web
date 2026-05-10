import './SplashScreen.css';

const LOGO_URL =
  'https://bnigucvyjnolcubofvvf.supabase.co/storage/v1/object/public/store-assets/perfumero_logo_ups-removebg-preview.png';

export default function SplashScreen() {
  return (
    <div className="splash">
      <div className="splash__center">
        <img
          src={LOGO_URL}
          alt="El Perfumero"
          className="splash__logo"
          draggable={false}
        />
        <span className="splash__tag">777</span>
      </div>
    </div>
  );
}
