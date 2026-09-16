/**
 * 曲奇插画，纯 CSS/DOM 画出来。
 * 原设计用的是 Manus 托管的照片，本地没有资源；等实拍图到位后
 * 把 .hero-image-frame 里的这块换成 <Image> 即可，外框和贴纸都不用动。
 */
export function CookieStack() {
  return (
    <div className="cookie-stack" aria-hidden="true">
      <div className="cookie-big">
        <i /><i /><i /><i /><i />
      </div>
      <span className="cookie-crumb" style={{ bottom: "16%", left: "22%" }} />
      <span className="cookie-crumb" style={{ bottom: "12%", right: "26%", height: 9, width: 9 }} />
    </div>
  );
}

export function GiantCookie() {
  return (
    <div className="giant-cookie" aria-hidden="true">
      <span /><span /><span /><span /><span /><span />
    </div>
  );
}
