import React from "react";
import styles from "../../styles/Components.module.scss";

export function WelcomeHeader(props: {
  title: React.ReactNode;
  subtitle: React.ReactNode;
}) {
  return (
    <div className={styles.welcomeHeader}>
      <div className={styles.title}>{props.title}</div>
      <div className={styles.subtitle}>{props.subtitle}</div>
    </div>
  );
}
