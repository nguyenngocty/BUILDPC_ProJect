import "./About.css";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

import { Link } from "react-router-dom";

import AboutHero from "../../components/About/AboutHero";
import AboutCompany from "../../components/About/AboutCompany";
import AboutMission from "../../components/About/AboutMission";
import AboutWhyChoose from "../../components/About/AboutWhyChoose";
import AboutProcess from "../../components/About/AboutProcess";

// Phần sau sẽ thêm
// import AboutStats from "../../components/About/AboutStats";
// import AboutPartners from "../../components/About/AboutPartners";
// import AboutCTA from "../../components/About/AboutCTA";

import getAboutData from "../../../controllers/aboutController";

function About() {
  const about = getAboutData();

  return (
    <>
      <Header />

      <div className="about-breadcrumb">
        <div className="container">
          <Link to="/">Trang chủ</Link>

          <span>/</span>

          <span>Về chúng tôi</span>
        </div>
      </div>

      <main className="about-page">
        <AboutHero data={about.hero} />

        <AboutCompany data={about.company} />

        <AboutMission />

        <AboutWhyChoose />

        <AboutProcess />

        {/* Phần sau */}
        {/* <AboutStats /> */}
        {/* <AboutPartners /> */}
        {/* <AboutCTA /> */}
      </main>

      <Footer />
    </>
  );
}

export default About;
