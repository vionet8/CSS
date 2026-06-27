interface Props {
  recipeName: string
  time?: string
  difficulty?: string
  calories?: string
  ingredients?: string[]
  accentColor: string
  imageUrl?: string
}

export default function RecipeCardScene({
  recipeName,
  time = '30分',
  difficulty = '★★☆',
  calories,
  ingredients = [],
  accentColor,
  imageUrl,
}: Props) {
  return (
    <div className="w-full h-full flex flex-col bg-[#f8f8f8]">
      {/* Recipe image */}
      <div
        className="h-[45%] flex-shrink-0 flex items-center justify-center text-6xl"
        style={{
          background: imageUrl
            ? `url(${imageUrl}) center/cover`
            : `linear-gradient(135deg, ${accentColor}22, ${accentColor}44)`,
        }}
      >
        {!imageUrl && '🍽️'}
      </div>

      {/* Card content */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-4 px-5 pt-5 pb-3 shadow-lg overflow-hidden">
        <h2 className="text-xl font-black text-gray-900 mb-2 leading-tight">{recipeName}</h2>

        {/* Stats row */}
        <div className="flex gap-3 mb-4">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>⏱️</span><span>{time}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>📊</span><span>{difficulty}</span>
          </div>
          {calories && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>🔥</span><span>{calories}</span>
            </div>
          )}
        </div>

        {/* Ingredients */}
        {ingredients.length > 0 && (
          <>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">材料</p>
            <div className="grid grid-cols-2 gap-1">
              {ingredients.slice(0, 6).map((ing, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: accentColor }} />
                  {ing}
                </div>
              ))}
            </div>
          </>
        )}

        {/* CTA */}
        <div
          className="mt-4 w-full py-2.5 rounded-xl text-white text-sm font-bold text-center"
          style={{ backgroundColor: accentColor }}
        >
          レシピを見る →
        </div>
      </div>
    </div>
  )
}
