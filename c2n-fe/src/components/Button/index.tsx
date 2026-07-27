import styles from './index.module.scss'
export const Button = ({ onClick, text,style }) => {
    return <div
        className={styles['button']}
        onClick={onClick}
        style={style}
    >
        {text}
    </div>
}