export const BLUE = 'blue'
export const RED = 'red'

export const Roles = {
  Merlin: { id: 'merlin', name: '梅林', side: BLUE },
  Percival: { id: 'percival', name: '派西维尔', side: BLUE },
  Servant: { id: 'servant', name: '忠臣', side: BLUE },
  Mordred: { id: 'mordred', name: '莫德雷德', side: RED },
  Morgana: { id: 'morgana', name: '莫甘娜', side: RED },
  Assassin: { id: 'assassin', name: '刺客', side: RED },
  Oberon: { id: 'oberon', name: '奥伯伦', side: RED },
  Minion: { id: 'minion', name: '爪牙', side: RED }
}

export function initialConfig() {
  return {
    playerCount: 5,
    include: {
      mordred: false,
      oberon: false,
      minion: false
    }
  }
}

export function roleSetupForCount(count, include) {
  // 基于官方表格的默认角色配置（不含扩展可选）
  // include 可添加：mordred, oberon, minion
  const setup = []
  const add = r => setup.push(r)

  if (count === 5) {
    add(Roles.Merlin); add(Roles.Percival); add(Roles.Servant)
    add(Roles.Morgana); add(Roles.Assassin)
  } else if (count === 6) {
    add(Roles.Merlin); add(Roles.Percival); add(Roles.Servant); add(Roles.Servant)
    add(Roles.Morgana); add(Roles.Assassin)
  } else if (count === 7) {
    add(Roles.Merlin); add(Roles.Percival); add(Roles.Servant); add(Roles.Servant)
    add(Roles.Morgana); add(Roles.Assassin); add(Roles.Oberon)
  } else if (count === 8) {
    add(Roles.Merlin); add(Roles.Percival); add(Roles.Servant); add(Roles.Servant); add(Roles.Servant)
    add(Roles.Morgana); add(Roles.Assassin); add(Roles.Minion)
  } else if (count === 9) {
    add(Roles.Merlin); add(Roles.Percival); add(Roles.Servant); add(Roles.Servant); add(Roles.Servant); add(Roles.Servant)
    add(Roles.Mordred); add(Roles.Morgana); add(Roles.Assassin)
  } else if (count === 10) {
    add(Roles.Merlin); add(Roles.Percival); add(Roles.Servant); add(Roles.Servant); add(Roles.Servant); add(Roles.Servant)
    add(Roles.Mordred); add(Roles.Morgana); add(Roles.Oberon); add(Roles.Assassin)
  }

  // 应用可选扩展（如用户强制包含）
  if (include?.mordred && !setup.some(r => r.id === 'mordred')) add(Roles.Mordred)
  if (include?.oberon && !setup.some(r => r.id === 'oberon')) add(Roles.Oberon)
  if (include?.minion && !setup.some(r => r.id === 'minion')) add(Roles.Minion)

  // 若数量不匹配，补充或裁剪忠臣
  while (setup.length < count) add(Roles.Servant)
  while (setup.length > count) {
    const idx = setup.findIndex(r => r.id === 'servant')
    if (idx >= 0) setup.splice(idx, 1)
    else setup.pop()
  }
  return setup
}

export function teamSizeForRound(count) {
  // 任务人数配置
  if (count === 5) return [2,3,2,3,3]
  if (count === 6) return [2,3,4,3,4]
  if (count === 7) return [2,3,3,4,4]
  // 8-10
  return [3,4,4,5,5]
}

export function isProtectedRound(count, roundIndex) {
  // 第4轮保护轮：7人及以上
  return roundIndex === 3 && count >= 7
}



