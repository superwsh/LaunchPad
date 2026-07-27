import { Row, Col,Modal } from 'antd'
import styles from './dex.module.scss'
import { useResponsive } from '@src/hooks/useResponsive';
import { Button } from '@src/components/Button';
import { IconBeforeTitle } from '@src/components/icons';
import ScrollAnimation from 'react-animate-on-scroll';
import { useRouter } from 'next/router'
import { LiquidityModal } from '@src/containers/LiquidityModal/LiquidityModal';

/**
 * Dex form page
 */
export default function Dex() {
  const {
    isDesktopOrLaptop,
  } = useResponsive();
  const router = useRouter();

  const section = (
    <ScrollAnimation scrollableParentSelector={'.main-body'} animateIn={styles['animated-4']} animateOnce>
      <section className={`${styles['sec-4']} ${styles['sec']} sec-4`}>
        <div className={"background " + styles['background-4']}></div>
        <div className="main-content">
          <h2 className={[styles['colored-title'], styles['appear']].join(' ')}>
            <IconBeforeTitle className={styles['before-title']} />
            Liquidity Providers & Traders
          </h2>
          <Row justify="space-between">
            <Col span={isDesktopOrLaptop ? 12 : 24} className={['desc', styles['appear']].join(' ')}>
              Participate in a decentralized exchange designed for seamless token swaps <br />
              and liquidity provision. Whether you're a trader looking for low-slippage <br />
              transactions or a liquidity provider seeking passive earnings, C2N Dex offers <br />
              a secure and rewarding ecosystem.
            </Col>
            <Col span={isDesktopOrLaptop ? 12 : 24} className="features">
              <Row justify="space-around">
                {
                  [
                    [<>Maximized Trading Efficiency</>],
                    [<>Zero Platform Fee</>],
                    [<>Competitive Liquidity Rewards</>],
                    [<>Secure & Transparent</>],
                  ].map((val, index) => (
                    <Col span={11}
                      className={['feature', styles['pop'], styles['feature-' + (index + 1)]].join(' ')} key={index}>
                      <div className={["text absolute-horizontal-center", styles['label']].join(' ')}>{val[0]}</div>
                    </Col>
                  ))
                }
              </Row>
            </Col>
          </Row>
        </div>
        <style lang="scss">{`
          .sec-4 h2 {
            margin-top: 0;
            margin-bottom: 90px;
          }
          .sec-4 .desc {
            width: 55%;
            margin-bottom: 20px;
          }
          .sec-4 .extra {
            font-family: LucidaGrande;
            margin-top: 123px;
            font-size: 0.35rem;
            color: #FFB852;
          }
          .sec-4 .feature {
            display: inline-block;
            width: 100%;
            height: 133px;
            border-radius: 16px;
            margin-bottom: 20px;
            background-image: linear-gradient(179deg, #D7FF1E80 0%, #FFB85280 100%);
            transition: scale 1s;
            transform: scale(1);
          }
          .sec-4 .feature:hover {
            background-image: linear-gradient(179deg, #D7FF1EBD 0%, #FFB852BD 100%);
            transform: scale(1.1);
          }
          .sec-4 .text {
            width: 100%;
            position: absolute;
            top: 50%;
            text-align: center;
            font-size: 0.24rem;
            transform: translateY(-50%);
          }
          @media (max-width:769px) {
            .sec-4 h2 {
              margin-bottom: 20px;
            }
          }
        `}</style>
      </section>
    </ScrollAnimation>
  )

  return (
    <main className={styles['container'] + " container"}>
      <section className={styles['intro'] + ' main-content'}>
        <h2 className={styles['dex-title']}>
          <Row justify="start">
            <Col>
              <span>C2N Dex</span>
            </Col>
          </Row>
        </h2>
        <h3 className={styles['dex-subtitle']}>
          <Row justify="start">
            C2N Dex allow users to swap tokens & provide liquidity as market maker to earn transaction fee.
          </Row>
        </h3>
      </section>
      <section className={styles['dex-content']}>
        <div className="main-content">
          <Row gutter={100} justify={isDesktopOrLaptop ? "start" : "start"}>
            <Col>
              <Button
                onClick={() => router.push('/swap')}
                text='Swap'
              />
            </Col>
            <Col>
            <Button
                onClick={() => router.push('/liquidity')}
                text='Liquidity'
              />
            </Col>
          </Row>
        </div>
      </section>
      {section}
    </main>
  )
}
