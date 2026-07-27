import { Row, Col, Tabs } from "antd";
import { useWallet } from '@src/hooks/useWallet'
import { useResponsive } from '@src/hooks/useResponsive';

import styles from './SwapPage.module.scss';
import { AddPage } from "./AddPage";
import RemovePage from "./RemovePage";

export default function LiquidityPage({ pair }: { pair: string }) {
  const {
    isDesktopOrLaptop,
  } = useResponsive();

  // TODO: modify pool id
  // 0: bre pool 1: boba pool

  const {
    chain,
  } = useWallet();

  const items = [{
    key: '0',
    label: "Add Liquidity",
    children: chain?.chainId && <AddPage pair={pair} />
  }]

  if (pair) {
    items.push({
      key: '1',
      label: 'Remove Liquidity',
      children: <RemovePage pair={pair} />
    })
  }



  return (
    <div className={styles['bridge-form']}>
      {/* deposit form */}
      <section className={styles['section']}>
        <Row justify="space-between" gutter={[16, 16]}>
          <Col className={styles['container']} span={isDesktopOrLaptop ? 24 : 24}>
            <Tabs items={items} />
          </Col>
        </Row>
      </section>
    </div>
  );
}
