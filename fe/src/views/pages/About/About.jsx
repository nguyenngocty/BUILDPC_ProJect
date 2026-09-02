import "./About.css";

import { Link } from "react-router-dom";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

import AboutHero from "../../components/About/AboutHero";
import AboutCompany from "../../components/About/AboutCompany";
import AboutMission from "../../components/About/AboutMission";
import AboutWhyChoose from "../../components/About/AboutWhyChoose";
import AboutProcess from "../../components/About/AboutProcess";

import getAboutData from "../../../controllers/aboutController";

function About() {
  const about = getAboutData();

  return (
    <div className="about-site">
      <Header />

      <div className="about-breadcrumb">
        <div className="about-breadcrumb__shell">
          <Link to="/">Trang chủ</Link>

          <i className="bi bi-chevron-right" />

          <span>Về chúng tôi</span>
        </div>
      </div>

      <main className="about-page">
        <AboutHero data={about.hero} />

        <AboutCompany data={about.company} />

        <AboutMission />

        <AboutWhyChoose />

        <AboutProcess />
      </main>

      <Footer />
    </div>
  );
}

export default About;
