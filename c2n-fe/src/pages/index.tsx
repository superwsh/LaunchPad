import Link from 'next/link'
import { useMemo } from 'react'
import styles from './index.module.scss'
import { Row, Col } from 'antd';
import { useResponsive } from '@src/hooks/useResponsive';

import HomeBanner from '@src/containers/HomeBanner/HomeBanner';


export default function Index() {
  const {
    isDesktopOrLaptop,
  } = useResponsive();

  const section = useMemo(() => {
    return (<section className={[styles['sec-1'], styles['sec'], 'sec-1', styles['animated-1']].join(' ')}>
      <div className={"background " + styles['background-1']}></div>
      <div className="main-content">
        <HomeBanner />
        <Row>
          <Col span={isDesktopOrLaptop ? 18 : 24}>
            <h1 className="title">
              C2N: Fundraising platform
              <br />
              on Sepolia
            </h1>
            <div className="desc">
              C2N is the first exclusive launchpad for decentralized fundraising
              <br />
              offering the hottest and innovative projects in
              <br />
              a fair, secure, and efficient way.
            </div>
            <Link href="/stake" passHref>
              <div className={styles['button'] + ' button'}>Stake</div>
            </Link>
          </Col>
          <Col span={isDesktopOrLaptop ? 6 : 0}>
            {
              isDesktopOrLaptop
                ? <div className={styles.banner}></div>
                : <></>
            }
          </Col>
        </Row>
      </div>
      <style lang="scss">{`
        .sec-1 {
          position: relative;
          background-color: #000000;
        }
        .sec-1 h1 {
          font-size: 0.46rem;
          color: #ffffff;
        }
        .sec-1 .main-content {
          padding-top: .1rem;
          padding-bottom: 1rem;
        }
        .sec-1 .desc {
          margin-top: 23px;
          line-height: 40px;
          font-size: 0.20rem;
        }
        .sec-1 .button {
          margin-top: 30px;
          font-size: 0.22rem;
        }
        .sec-1 .medias {
          margin-top: 28px;
        }
        .sec-1 .circle {
          display: inline-block;
          width: 40px;
          height: 40px;
          background-color: transparent;
          border-radius: 50%;
          margin-right: 10px;
          cursor: pointer;
          text-align: center;
          line-height: 40px;
        }
        .sec-1 .circle:hover {
          filter: brightness(0.5);
        }
        .sec-1 .medias i.icon {
        }
        .sec-1 .extra {
          margin-top: 115px;
        }
        .sec-1 .extra .icon {
          display: inline-block;
          margin-left: 38px;
          margin-right: 12px;
          vertical-align: middle;
        }
        @media (max-width: 769px) {
          .sec-1 .main-content {
            padding-top: .5rem;
          }
        }
      `}</style>
    </section>
    )
  }, [isDesktopOrLaptop]);

  return (
    <main className={"container " + styles['container']}>
      {section}
      <style lang="scss">{`
        @media (max-width: 767px) {
          .desc {
            white-space: normal;
          }
          br {
            content: normal;
          }
          br:after {
            content: normal;
            display: inline-block;
            width: .25em;
          }
        }
        .feature {
          user-select: none;
          cursor: pointer;
        }
        .background {
          width: 100%;
          height: 100%;
          position: absolute;
          z-index: -999;
          background-position: center;
        }
      `}</style>
    </main>
  )
}