/**
 * 曲奇插画，纯 CSS/DOM 画出来。
 * 中文首页 hero 已换成实拍图 /brand/04.jpg，CookieStack 留着备用；
 * 英文页的 GiantCookie 仍在用，暂时没有对应的实拍图。
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
