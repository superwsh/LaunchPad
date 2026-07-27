import { useSwap } from "@src/hooks/useSwap";
import { Col } from "antd";
import PairCard from "../PairCard/PairCard";

export default function Pairs({setPair, setOpen}) {
    const { pairsAddress } = useSwap();
    return <>
        {pairsAddress.map((addr, index) => {
        return (
            <Col span={7}
                key={index}
            >
                <PairCard
                    onSettingClick={() => {
                        setPair(addr)
                        setOpen(true)
                    }}
                    pair={addr}
                />
            </Col>
        )
    })}
    </>
}