/*
 * team — member grid (about page).
 *
 * Model (author contract): one row per member — optional avatar image cell +
 * name cell (name text, usually a LinkedIn link) + role cell. When no avatar
 * is authored, decorate() renders an initials circle derived from the name
 * text; the initials are aria-hidden — the name carries the meaning.
 */

/** initials from the name text: first letter of first + last word */
function initialsFor(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const first = words[0].charAt(0);
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
}

export default function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'team-list';
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'member';

    const avatarImg = row.querySelector('picture, img');
    const textCells = [...row.children]
      .filter((cell) => !cell.querySelector('picture, img') && cell.textContent.trim());
    const nameCell = textCells[0];
    const roleCell = textCells[1];

    const name = document.createElement('p');
    name.className = 'member-name';
    if (nameCell) {
      const link = nameCell.querySelector('a[href]');
      if (link) name.append(link);
      else name.textContent = nameCell.textContent.trim();
    }

    if (avatarImg) {
      const avatar = document.createElement('p');
      avatar.className = 'member-avatar';
      avatar.append(avatarImg);
      li.append(avatar);
    } else {
      const initials = document.createElement('span');
      initials.className = 'member-avatar member-initials';
      initials.setAttribute('aria-hidden', 'true');
      initials.textContent = initialsFor(name.textContent);
      li.append(initials);
    }

    li.append(name);
    if (roleCell) {
      const role = document.createElement('p');
      role.className = 'member-role';
      role.textContent = roleCell.textContent.trim(); // textContent (#79)
      li.append(role);
    }

    list.append(li);
    row.remove();
  });
  block.replaceChildren(list);
}
