import HeroBanner from '../../components/ui/HeroBanner/HeroBanner';
import CategoryScroll from '../../components/ui/CategoryScroll/CategoryScroll';
import FeaturedProducts from '../../components/ui/FeaturedProducts/FeaturedProducts';
import './Home.css';

export default function Home() {
  return (
    <div className="home">
      <HeroBanner />
      <CategoryScroll />
      <FeaturedProducts />
    </div>
  );
}
